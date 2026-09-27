import { useEffect, useMemo, useState } from 'react'
import { getPigBatches } from '../api.js'
import {
  FEED_TABLE, INGREDIENTS, NUTRIENT_NEEDS, PREMIX, READY_FEED_PRICE, feedForAge, needsFor,
} from '../data/feed.js'
import { batchPlan, bestMix } from '../utils/feedMix.js'

// หน้า "อาหารสัตว์" — ตอบ 3 คำถามของคนเลี้ยง:
//   1. หมูอายุเท่านี้ ต้องให้อาหารวันละกี่กิโล (ตารางมาตรฐาน)
//   2. ผสมเองยังไงให้โปรตีนถึงเกณฑ์ และถูกที่สุดจากของที่มี
//   3. ถูกกว่าซื้ออาหารสำเร็จรูปเท่าไหร่
//
// ราคาวัตถุดิบแก้ได้เอง เก็บไว้ในเครื่อง (ราคาตลาดเปลี่ยนตลอด ค่าในโค้ดเป็นแค่ค่าเริ่มต้น)

const PRICE_KEY = 'feed-prices'
const OFF_KEY = 'feed-disabled'
const money = (n) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const kg = (n) => n.toLocaleString('th-TH', { maximumFractionDigits: 1 })

export default function FeedPage() {
  const [age, setAge] = useState(60)
  const [count, setCount] = useState(20)
  const [batches, setBatches] = useState([])
  const [prices, setPrices] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PRICE_KEY) || '{}') } catch { return {} }
  })
  const [disabled, setDisabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem(OFF_KEY) || '[]') } catch { return [] }
  })
  const [showTable, setShowTable] = useState(false)

  useEffect(() => { getPigBatches().then((d) => setBatches(d?.rows || [])).catch(() => {}) }, [])
  useEffect(() => { localStorage.setItem(PRICE_KEY, JSON.stringify(prices)) }, [prices])
  useEffect(() => { localStorage.setItem(OFF_KEY, JSON.stringify(disabled)) }, [disabled])

  const priceOf = (ing) => (prices[ing.id] != null ? Number(prices[ing.id]) : ing.price)
  const list = useMemo(
    () => INGREDIENTS.map((i) => ({ ...i, price: priceOf(i) })).filter((i) => !disabled.includes(i.id)),
    [prices, disabled],
  )

  const row = feedForAge(Number(age) || 0)
  const need = needsFor(row.weight)
  const perDay = row.perDay
  const totalDay = perDay * (Number(count) || 0)
  const result = useMemo(() => bestMix(list, need, PREMIX), [list, need])
  const ready = READY_FEED_PRICE[need.id]

  const mixRows = result ? batchPlan(result.mix, totalDay) : []
  const premixKg = +(totalDay * PREMIX.percent / 100).toFixed(2)
  const costDay = result ? result.price * totalDay : 0
  const saveDay = result ? (ready - result.price) * totalDay : 0

  return (
    <div className="fd">
      <header className="fd-head">
        <span className="fd-head-icon"><i className="ti ti-bowl" aria-hidden="true" /></span>
        <div>
          <h1 className="fd-title">อาหารสัตว์</h1>
          <p className="fd-sub">ให้เท่าไหร่ถึงพอ · ผสมเองยังไงให้ถูกที่สุด</p>
        </div>
        <button type="button" className="btn-clear fd-tablebtn" onClick={() => setShowTable((v) => !v)}>
          <i className="ti ti-table" aria-hidden="true" /> {showTable ? 'ซ่อนตาราง' : 'ตารางมาตรฐาน'}
        </button>
      </header>

      {/* ใส่อายุกับจำนวน */}
      <div className="panel fd-input">
        <div className="fd-input-row">
          <label className="fd-field">
            <span>อายุสุกร (วัน)</span>
            <input type="number" min="1" max="250" className="chat-input fd-big" value={age} onChange={(e) => setAge(e.target.value)} />
          </label>
          <label className="fd-field">
            <span>จำนวน (ตัว)</span>
            <input type="number" min="1" className="chat-input fd-big" value={count} onChange={(e) => setCount(e.target.value)} />
          </label>
          {batches.length > 0 && (
            <label className="fd-field fd-batch">
              <span>หรือเลือกจากชุดหมู</span>
              <select className="chat-input" defaultValue="" onChange={(e) => {
                const b = batches.find((x) => String(x.id) === e.target.value)
                if (b) { setAge(b.age_days ?? age); setCount(b.pig_count ?? count) }
              }}>
                <option value="">— เลือก —</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} · {b.age_days ?? '?'} วัน · {b.pig_count ?? '?'} ตัว</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="fd-tiles">
          <div className="fd-tile"><span>น้ำหนักโดยประมาณ</span><b>{kg(row.weight)} <small>กก./ตัว</small></b></div>
          <div className="fd-tile hi"><span>ให้อาหารวันละ</span><b>{kg(perDay)} <small>กก./ตัว</small></b></div>
          <div className="fd-tile hi"><span>รวมทั้งชุด</span><b>{kg(totalDay)} <small>กก./วัน</small></b></div>
          <div className="fd-tile"><span>ช่วงการเลี้ยง</span><b className="fd-stage">{need.label}</b><small>โปรตีน {need.cp}% · ME {need.me}</small></div>
        </div>
        {row.estimated && <div className="fd-note"><i className="ti ti-info-circle" aria-hidden="true" /> อายุนี้อยู่นอกช่วงของตาราง ใช้ค่าของแถวที่ใกล้ที่สุด</div>}
      </div>

      {showTable && (
        <div className="panel fd-sec">
          <div className="fd-sec-head"><i className="ti ti-table" aria-hidden="true" /> ตารางมาตรฐานการกินอาหารตามอายุ</div>
          <div className="table-wrap">
            <table className="data-table fd-table">
              <thead><tr><th>อายุ (วัน)</th><th>น้ำหนัก (กก.)</th><th>โตวันละ (ก.)</th><th>FCR</th><th>กิน/ตัว/วัน (กก.)</th><th>สะสม (กก.)</th></tr></thead>
              <tbody>
                {FEED_TABLE.map((r) => (
                  <tr key={r.age} className={Math.abs(r.age - Number(age)) <= 6 ? 'fd-row-on' : ''}>
                    <td><b>{r.age}</b></td><td>{r.weight}</td><td>{r.adg}</td><td>{r.fcr ?? '—'}</td>
                    <td><b>{r.perDay}</b></td><td>{r.cumulative}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* สูตรผสมที่ถูกที่สุด */}
      <div className="panel fd-sec">
        <div className="fd-sec-head">
          <i className="ti ti-flask" aria-hidden="true" /> สูตรผสมที่ถูกที่สุดสำหรับ{need.label}
          {result && <span className="fd-price-tag">{money(result.price)} บาท/กก.</span>}
        </div>

        {!result ? (
          <div className="empty-note">หาสูตรที่โปรตีนถึงเกณฑ์ไม่ได้จากวัตถุดิบที่เลือกไว้ — ลองเปิดใช้วัตถุดิบโปรตีนสูง เช่น กากถั่วเหลือง หรือปลาป่น</div>
        ) : (
          <>
            <div className="fd-mix">
              {mixRows.map((m) => (
                <div className="fd-mix-row" key={m.id}>
                  <div className="fd-bar"><i style={{ width: `${m.percent}%` }} /></div>
                  <b>{m.name}</b>
                  <span className="fd-pct">{m.percent}%</span>
                  <span className="fd-kg">{kg(m.kg)} กก./วัน</span>
                </div>
              ))}
              <div className="fd-mix-row premix">
                <div className="fd-bar"><i style={{ width: `${PREMIX.percent}%` }} /></div>
                <b>{PREMIX.name}</b>
                <span className="fd-pct">{PREMIX.percent}%</span>
                <span className="fd-kg">{kg(premixKg)} กก./วัน</span>
              </div>
            </div>

            <div className="fd-result">
              <div className="fd-res"><span>โปรตีนที่ได้</span><b className="ok">{result.cp}%</b><small>ต้องการ {need.cp}%</small></div>
              <div className={`fd-res ${result.me < need.me ? 'low' : ''}`}>
                <span>พลังงาน (ME)</span>
                <b>{result.me}</b>
                <small>{result.me < need.me ? `ต่ำกว่าเกณฑ์ ${need.me} เล็กน้อย — โตช้ากว่าปกติได้` : `ต้องการ ${need.me} kcal/kg`}</small>
              </div>
              <div className="fd-res"><span>ค่าอาหารต่อวัน</span><b>{money(costDay)} ฿</b><small>ทั้งชุด {count} ตัว</small></div>
              <div className={`fd-res ${saveDay > 0 ? 'save' : ''}`}>
                <span>เทียบอาหารสำเร็จรูป</span>
                <b>{saveDay > 0 ? `ประหยัด ${money(saveDay)} ฿/วัน` : `แพงกว่า ${money(-saveDay)} ฿/วัน`}</b>
                <small>สำเร็จรูป {ready} ฿/กก.</small>
              </div>
            </div>
          </>
        )}
      </div>

      {/* วัตถุดิบ + ราคา */}
      <div className="panel fd-sec">
        <div className="fd-sec-head"><i className="ti ti-basket" aria-hidden="true" /> วัตถุดิบที่มี <small>แก้ราคาให้ตรงกับที่ซื้อจริง แล้วสูตรจะคำนวณใหม่ทันที</small></div>
        <div className="table-wrap">
          <table className="data-table fd-table">
            <thead><tr><th>ใช้</th><th>วัตถุดิบ</th><th>โปรตีน</th><th>พลังงาน</th><th>ใส่ได้ไม่เกิน</th><th>ราคา (฿/กก.)</th></tr></thead>
            <tbody>
              {INGREDIENTS.map((ing) => {
                const off = disabled.includes(ing.id)
                return (
                  <tr key={ing.id} className={off ? 'fd-off' : ''}>
                    <td>
                      <input type="checkbox" checked={!off} aria-label={`ใช้${ing.name}`}
                        onChange={() => setDisabled((d) => (off ? d.filter((x) => x !== ing.id) : [...d, ing.id]))} />
                    </td>
                    <td><b>{ing.name}</b><div className="fd-dim">{ing.note}</div></td>
                    <td>{ing.cp}%</td>
                    <td>{ing.me}</td>
                    <td>{ing.max}%</td>
                    <td>
                      <input type="number" min="0" step="0.5" className="chat-input fd-price"
                        value={prices[ing.id] ?? ing.price}
                        onChange={(e) => setPrices((p) => ({ ...p, [ing.id]: e.target.value }))} />
                    </td>
                  </tr>
                )
              })}
              <tr>
                <td><i className="ti ti-lock" aria-hidden="true" title="ต้องมีเสมอ" /></td>
                <td><b>{PREMIX.name}</b><div className="fd-dim">วิตามินและแร่ธาตุ ขาดไม่ได้ ถึงโปรตีนจะพอแล้วก็ตาม</div></td>
                <td>—</td><td>—</td><td>{PREMIX.percent}%</td><td>{PREMIX.price}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {prices && Object.keys(prices).length > 0 && (
          <button type="button" className="btn-clear fd-reset" onClick={() => setPrices({})}>
            <i className="ti ti-rotate" aria-hidden="true" /> คืนราคาเริ่มต้น
          </button>
        )}
      </div>

      <p className="fd-warn">
        <i className="ti ti-alert-triangle" aria-hidden="true" />
        สูตรนี้คุมแค่โปรตีนรวมกับพลังงาน ยังไม่ได้คุมกรดอะมิโน (ไลซีน) แคลเซียม ฟอสฟอรัส และไฟเบอร์ —
        ใช้เป็นแนวทางลดต้นทุนและสั่งของได้ แต่ก่อนใช้จริงกับทั้งฟาร์ม ควรให้สัตวบาลหรือสัตวแพทย์ตรวจสูตรอีกครั้ง
        และเปลี่ยนสูตรแบบค่อย ๆ ผสมของเก่ากับของใหม่ 3–5 วัน ไม่ให้หมูท้องเสีย
      </p>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { getPigBatches } from '../api.js'
import { FEED_TABLE, INGREDIENTS, PREMIX, feedForAge, needsFor } from '../data/feed.js'
import { solveMix, suggestAdditions, toAmounts } from '../utils/feedMix.js'

// หน้า "อาหารสัตว์" — ใช้งาน 3 ขั้น: ① ใส่อายุ+จำนวน ② ติ๊กวัตถุดิบที่มีแล้วใส่ราคา ③ ได้สูตรที่ถูกที่สุด
//
// ไม่มีราคาตั้งต้นในระบบโดยตั้งใจ — ราคาตลาดเปลี่ยนตลอดและต่างกันตามพื้นที่
// ถ้าใส่ตัวเลขมั่ว ๆ ไว้ คนจะเผลอเชื่อว่าเป็นราคาจริงแล้วตัดสินใจผิด
// วัตถุดิบจะเข้าสูตรก็ต่อเมื่อ "ติ๊กว่ามี" และ "ใส่ราคาแล้ว" เท่านั้น

const HAVE_KEY = 'feed-have'
const PRICE_KEY = 'feed-prices'
const READY_KEY = 'feed-ready-price'
const money = (n) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const kg = (n) => n.toLocaleString('th-TH', { maximumFractionDigits: 1 })
// ต่อตัวต่อวันมักไม่ถึง 1 กก. ถ้าปัดเป็นกิโลจะเหลือ 0 — ต่ำกว่า 1 กก. ให้บอกเป็นกรัม
const perPig = (n) => (n >= 1
  ? `${n.toLocaleString('th-TH', { maximumFractionDigits: 2 })} กก.`
  : `${Math.round(n * 1000).toLocaleString('th-TH')} ก.`)
const load = (k, fallback) => {
  try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v) } catch { return fallback }
}

const STEPS = [
  { icon: 'ti-pig', title: 'ใส่อายุกับจำนวนหมู', desc: 'หรือเลือกจากชุดหมูที่บันทึกไว้แล้ว' },
  { icon: 'ti-checkbox', title: 'ติ๊กว่ามีวัตถุดิบอะไรบ้าง', desc: 'มีแค่ไหนติ๊กแค่นั้น ราคาใส่ทีหลังก็ได้' },
  { icon: 'ti-scale', title: 'ระบบบอกว่าใช้อย่างละกี่กิโล', desc: 'ต่อตัวต่อวัน และรวมทั้งชุด' },
]

export default function FeedPage() {
  const [age, setAge] = useState(60)
  const [count, setCount] = useState(20)
  const [batches, setBatches] = useState([])
  const [have, setHave] = useState(() => load(HAVE_KEY, []))
  const [prices, setPrices] = useState(() => load(PRICE_KEY, {}))
  const [readyPrice, setReadyPrice] = useState(() => load(READY_KEY, ''))
  const [showTable, setShowTable] = useState(false)

  useEffect(() => { getPigBatches().then((d) => setBatches(d?.rows || [])).catch(() => {}) }, [])
  useEffect(() => { localStorage.setItem(HAVE_KEY, JSON.stringify(have)) }, [have])
  useEffect(() => { localStorage.setItem(PRICE_KEY, JSON.stringify(prices)) }, [prices])
  useEffect(() => { localStorage.setItem(READY_KEY, JSON.stringify(readyPrice)) }, [readyPrice])

  const priceOf = (id) => {
    const v = Number(prices[id])
    return Number.isFinite(v) && v > 0 ? v : null
  }
  // ใช้ทุกตัวที่ติ๊กว่ามี — ราคาเป็นของเสริม ไม่ใส่ก็คำนวณปริมาณให้ได้
  const usable = useMemo(
    () => INGREDIENTS.filter((i) => have.includes(i.id)).map((i) => ({ ...i, price: priceOf(i.id) || 0 })),
    [have, prices],
  )
  const premixPrice = priceOf(PREMIX.id)
  const missingPrice = have.filter((id) => !priceOf(id))

  const row = feedForAge(Number(age) || 0)
  const need = needsFor(row.weight)
  const totalDay = row.perDay * (Number(count) || 0)

  const result = useMemo(
    () => solveMix(usable, need, { ...PREMIX, price: premixPrice ?? 0 }),
    [usable, need, premixPrice],
  )
  // ของที่ยังไม่มี ตัวไหน (หรือคู่ไหน) เติมแล้วทำให้ถึงเกณฑ์
  const suggestions = useMemo(
    () => (result && !result.enough ? suggestAdditions(usable, INGREDIENTS, need, { ...PREMIX, price: premixPrice ?? 0 }) : []),
    [result, usable, need, premixPrice],
  )
  const mixRows = result ? toAmounts(result.mix, row.perDay, Number(count) || 0) : []
  const premixKg = +(totalDay * PREMIX.percent / 100).toFixed(2)
  const costDay = result?.price != null ? result.price * totalDay : null
  const ready = Number(readyPrice) > 0 ? Number(readyPrice) : null
  const saveDay = result?.price != null && ready ? (ready - result.price) * totalDay : null

  const tooFew = have.length < 2

  return (
    <div className="fd">
      <header className="fd-head">
        <span className="fd-head-icon"><i className="ti ti-bowl" aria-hidden="true" /></span>
        <div>
          <h1 className="fd-title">อาหารสัตว์</h1>
          <p className="fd-sub">ให้เท่าไหร่ถึงพอ · ผสมเองยังไงให้ถูกที่สุดจากของที่มี</p>
        </div>
        <button type="button" className="btn-clear fd-tablebtn" onClick={() => setShowTable((v) => !v)}>
          <i className="ti ti-table" aria-hidden="true" /> {showTable ? 'ซ่อนตาราง' : 'ตารางมาตรฐาน'}
        </button>
      </header>

      <ol className="fd-steps">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <span className="fd-stepno">{i + 1}</span>
            <i className={`ti ${s.icon}`} aria-hidden="true" />
            <div><b>{s.title}</b><small>{s.desc}</small></div>
          </li>
        ))}
      </ol>

      {/* ① อายุ + จำนวน */}
      <div className="panel fd-input">
        <div className="fd-sec-head"><span className="fd-num">1</span> หมูชุดไหน อายุเท่าไหร่</div>
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
              <span>หรือเลือกจากชุดหมูที่บันทึกไว้</span>
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
          <div className="fd-tile hi"><span>ให้อาหารวันละ</span><b>{kg(row.perDay)} <small>กก./ตัว</small></b></div>
          <div className="fd-tile hi"><span>รวมทั้งชุด</span><b>{kg(totalDay)} <small>กก./วัน</small></b></div>
          <div className="fd-tile"><span>ช่วงการเลี้ยง</span><b className="fd-stage">{need.label}</b><small>ต้องการโปรตีน {need.cp}% · ME {need.me}</small></div>
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

      {/* ② วัตถุดิบที่มี + ราคา */}
      <div className="panel fd-sec">
        <div className="fd-sec-head">
          <span className="fd-num">2</span> ติ๊กว่าฟาร์มมีวัตถุดิบอะไรบ้าง
          <small>ราคาใส่หรือไม่ใส่ก็ได้ — ใส่แล้วถึงจะบอกต้นทุนและเลือกสูตรที่ถูกที่สุดให้</small>
        </div>
        <div className="table-wrap">
          <table className="data-table fd-table">
            <thead><tr><th>มี</th><th>วัตถุดิบ</th><th>โปรตีน</th><th>พลังงาน</th><th>ใส่ได้ไม่เกิน</th><th>ราคา (฿/กก.)</th></tr></thead>
            <tbody>
              {INGREDIENTS.map((ing) => {
                const on = have.includes(ing.id)
                const needPrice = on && !priceOf(ing.id)
                return (
                  <tr key={ing.id} className={on ? '' : 'fd-off'}>
                    <td>
                      <input type="checkbox" checked={on} aria-label={`มี${ing.name}`}
                        onChange={() => setHave((h) => (on ? h.filter((x) => x !== ing.id) : [...h, ing.id]))} />
                    </td>
                    <td><b>{ing.name}</b><div className="fd-dim">{ing.note}</div></td>
                    <td>{ing.cp}%</td>
                    <td>{ing.me}</td>
                    <td>{ing.max}%</td>
                    <td>
                      <input type="number" min="0" step="0.5" inputMode="decimal"
                        className={`chat-input fd-price ${needPrice ? 'need' : ''}`}
                        placeholder={on ? 'ใส่ราคา' : '—'}
                        disabled={!on}
                        value={prices[ing.id] ?? ''}
                        onChange={(e) => setPrices((p) => ({ ...p, [ing.id]: e.target.value }))} />
                    </td>
                  </tr>
                )
              })}
              <tr className={have.length ? '' : 'fd-off'}>
                <td><i className="ti ti-lock" aria-hidden="true" title="ต้องมีเสมอ" /></td>
                <td><b>{PREMIX.name}</b><div className="fd-dim">วิตามินและแร่ธาตุ ขาดไม่ได้ ถึงโปรตีนจะพอแล้วก็ตาม · ล็อกไว้ {PREMIX.percent}%</div></td>
                <td>—</td><td>—</td><td>{PREMIX.percent}%</td>
                <td>
                  <input type="number" min="0" step="1" inputMode="decimal" className="chat-input fd-price"
                    placeholder="ใส่ราคา" value={prices[PREMIX.id] ?? ''}
                    onChange={(e) => setPrices((p) => ({ ...p, [PREMIX.id]: e.target.value }))} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <label className="fd-ready">
          <span>ราคาอาหารสำเร็จรูปที่ใช้อยู่ (฿/กก.) <small>ไม่บังคับ — ใส่เพื่อเทียบว่าผสมเองคุ้มกว่าไหม</small></span>
          <input type="number" min="0" step="0.5" inputMode="decimal" className="chat-input fd-price"
            placeholder="เช่น 20" value={readyPrice} onChange={(e) => setReadyPrice(e.target.value)} />
        </label>
      </div>

      {/* ③ สูตร */}
      <div className="panel fd-sec">
        <div className="fd-sec-head">
          <span className="fd-num">3</span> ใช้อย่างละกี่กิโล ({need.label})
          {result?.price != null && <span className="fd-price-tag">{money(result.price)} บาท/กก.</span>}
        </div>

        {!result ? (
          <div className="fd-blocker">
            <i className="ti ti-arrow-up" aria-hidden="true" />
            <div><b>ติ๊กวัตถุดิบก่อน</b><span>ติ๊กว่ามีอะไรบ้างอย่างน้อย 2 อย่าง แล้วระบบจะบอกว่าใช้อย่างละกี่กิโล</span></div>
          </div>
        ) : (
          <>
            {!result.enough && (
              <div className="fd-short">
                <i className="ti ti-alert-triangle" aria-hidden="true" />
                <div>
                  <b>ของที่มียังทำให้ถึงเกณฑ์ไม่ได้ — นี่คือสูตรที่ดีที่สุดเท่าที่ทำได้</b>
                  <span>
                    ได้โปรตีน {result.cp}% (ต้องการ {need.cp}%) · พลังงาน {result.me} (ต้องการ {need.me})
                    {suggestions.length > 0 && (
                      <> — ถ้าเพิ่ม{' '}
                        {suggestions.map((g, i) => (
                          <b key={i}>{i > 0 ? ' หรือ ' : ''}{g.map((x) => `${x.name} ~${x.percent}%`).join(' + ')}</b>
                        ))}{' '}จะถึงเกณฑ์
                      </>
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="fd-mix">
              {mixRows.map((m) => (
                <div className="fd-mix-row" key={m.id}>
                  <div className="fd-bar"><i style={{ width: `${m.percent}%` }} /></div>
                  <b>{m.name}</b>
                  <span className="fd-pct">{m.percent}%</span>
                  <span className="fd-kg"><b>{perPig(m.kgPerPig)}</b>/ตัว/วัน · รวม {kg(m.kgTotal)} กก.</span>
                </div>
              ))}
              <div className="fd-mix-row premix">
                <div className="fd-bar"><i style={{ width: `${PREMIX.percent}%` }} /></div>
                <b>{PREMIX.name}</b>
                <span className="fd-pct">{PREMIX.percent}%</span>
                <span className="fd-kg"><b>{perPig(premixKg / Math.max(1, Number(count) || 1))}</b>/ตัว/วัน · รวม {kg(premixKg)} กก.</span>
              </div>
            </div>

            <div className="fd-result">
              <div className={`fd-res ${result.cp >= need.cp ? '' : 'low'}`}>
                <span>โปรตีนที่ได้</span><b className={result.cp >= need.cp ? 'ok' : ''}>{result.cp}%</b><small>ต้องการ {need.cp}%</small>
              </div>
              <div className={`fd-res ${result.me < need.me ? 'low' : ''}`}>
                <span>พลังงาน (ME)</span><b>{result.me}</b>
                <small>
                  {result.me >= need.me
                    ? `ต้องการ ${need.me} kcal/kg`
                    : `ต่ำกว่าเกณฑ์ ${need.me} อยู่ ${Math.round((1 - result.me / need.me) * 100)}% — โตช้ากว่าปกติได้`}
                </small>
              </div>
              <div className="fd-res">
                <span>ค่าอาหารต่อวัน</span>
                {costDay != null ? <b>{money(costDay)} ฿</b> : <b className="fd-faint">—</b>}
                <small>{costDay != null ? `ทั้งชุด ${count} ตัว` : 'ใส่ราคาวัตถุดิบเพื่อคิดต้นทุน'}</small>
              </div>
              {saveDay != null ? (
                <div className={`fd-res ${saveDay > 0 ? 'save' : 'low'}`}>
                  <span>เทียบอาหารสำเร็จรูป</span>
                  <b>{saveDay > 0 ? `ประหยัด ${money(saveDay)} ฿/วัน` : `แพงกว่า ${money(-saveDay)} ฿/วัน`}</b>
                  <small>สำเร็จรูป {ready} ฿/กก.</small>
                </div>
              ) : (
                <div className="fd-res"><span>เทียบอาหารสำเร็จรูป</span><b className="fd-faint">—</b><small>ใส่ราคาสำเร็จรูปด้านบนเพื่อเทียบ</small></div>
              )}
            </div>
            {costDay != null && !premixPrice && <div className="fd-note"><i className="ti ti-info-circle" aria-hidden="true" /> ยังไม่ได้ใส่ราคาพรีมิกซ์ ต้นทุนที่แสดงจึงยังไม่รวมส่วนนี้</div>}
            {missingPrice.length > 0 && (
              <div className="fd-note">
                <i className="ti ti-info-circle" aria-hidden="true" />
                ยังไม่ได้ใส่ราคา {INGREDIENTS.filter((i) => missingPrice.includes(i.id)).map((i) => i.name).join(', ')} —
                ปริมาณที่แนะนำยังใช้ได้ แต่ต้องใส่ราคาครบถึงจะเทียบได้ว่าสูตรไหนถูกที่สุด
              </div>
            )}
          </>
        )}
      </div>

      <p className="fd-warn">
        <i className="ti ti-alert-triangle" aria-hidden="true" />
        <span>
          <b>ที่มาของตัวเลข:</b> ตารางการกินตามอายุมาจากเอกสารที่ฟาร์มให้มา ·
          ค่าโปรตีน/พลังงานของวัตถุดิบและเกณฑ์ความต้องการเป็นค่ากลางที่ใช้กันทั่วไป ของจริงต่างกันได้ ±10% ·
          ราคาทั้งหมดมาจากที่ฟาร์มกรอกเอง ระบบไม่ได้ตั้งค่าให้<br />
          สูตรนี้คุมแค่โปรตีนรวมกับพลังงาน ยังไม่ได้คุมไลซีน แคลเซียม ฟอสฟอรัส —
          ใช้วางแผนสั่งของและลดต้นทุนได้ แต่ก่อนใช้จริงทั้งฟาร์มควรให้สัตวบาลตรวจสูตร
          และเปลี่ยนสูตรแบบค่อย ๆ ผสมของเก่ากับของใหม่ 3–5 วัน ไม่ให้หมูท้องเสีย
        </span>
      </p>
    </div>
  )
}

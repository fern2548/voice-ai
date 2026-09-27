import { useEffect, useState } from 'react'
import SectionNav from '../components/SectionNav.jsx'
import {
  BARN_STEPS, COMPONENTS, DISINFECTANTS, GOLDEN_RULE, MIX_RULES, ROUTINE,
  SOURCE_NOTE, VEHICLE_RISK, VEHICLE_STEPS,
} from '../data/biosecurity.js'

// หน้า "ทำความสะอาดโรงเรือน" — ขั้นตอนล้างจริงที่ติ๊กตามได้หน้าคอก
// ไม่ใช่แค่อ่าน แต่ใช้เป็นใบงาน: ติ๊กไปทีละขั้น ระบบจำไว้ให้ และคำนวณวันลงหมูรุ่นใหม่

const SECTIONS = [
  { id: 'cl-barn', label: 'ล้างโรงเรือน', icon: 'ti-building-warehouse' },
  { id: 'cl-vehicle', label: 'ล้างยานพาหนะ', icon: 'ti-truck' },
  { id: 'cl-parts', label: 'องค์ประกอบที่ต้องมี', icon: 'ti-shield-check' },
  { id: 'cl-chem', label: 'น้ำยาฆ่าเชื้อ', icon: 'ti-flask' },
  { id: 'cl-routine', label: 'งานประจำ', icon: 'ti-calendar-repeat' },
]

const LS_DONE = 'farmy.cleaning.done'
const LS_OUT = 'farmy.cleaning.outDate'
const LS_REST = 'farmy.cleaning.restDays'

const readJson = (k, fallback) => {
  try {
    const v = localStorage.getItem(k)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
const readStr = (k, fallback) => {
  try { return localStorage.getItem(k) || fallback } catch { return fallback }
}
const save = (k, v) => {
  try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)) } catch { /* ไม่เป็นไร */ }
}

const todayStr = () => new Date().toLocaleDateString('sv-SE')
const addDays = (iso, n) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  d.setDate(d.getDate() + n)
  return d
}
const fmt = (d) => (d ? d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' }) : '—')
const daysFromNow = (d) => (d ? Math.round((d - new Date(new Date().toDateString())) / 86400000) : null)

const RISK_TONE = { 'สูงมาก': 'hot', 'สูง': 'warn', 'ปานกลาง': 'mid' }

export default function CleaningPage() {
  const [done, setDone] = useState(() => readJson(LS_DONE, {}))
  const [outDate, setOutDate] = useState(() => readStr(LS_OUT, todayStr()))
  const [restDays, setRestDays] = useState(() => Number(readStr(LS_REST, '7')) || 7)
  const [openPart, setOpenPart] = useState(null)

  useEffect(() => { save(LS_DONE, done) }, [done])
  useEffect(() => { save(LS_OUT, outDate) }, [outDate])
  useEffect(() => { save(LS_REST, String(restDays)) }, [restDays])

  const toggle = (id) => setDone((d) => ({ ...d, [id]: !d[id] }))
  const barnDone = BARN_STEPS.filter((s) => done[s.id]).length
  const vehDone = VEHICLE_STEPS.filter((s) => done[s.id]).length
  const pct = Math.round((barnDone / BARN_STEPS.length) * 100)

  const resetBarn = () => {
    setDone((d) => {
      const next = { ...d }
      BARN_STEPS.forEach((s) => { delete next[s.id] })
      return next
    })
  }

  const inDate = addDays(outDate, restDays + 3)
  const left = daysFromNow(inDate)

  return (
    <div className="cl">
      <header className="cl-head">
        <span className="cl-head-icon"><i className="ti ti-spray" aria-hidden="true" /></span>
        <div>
          <h1 className="cl-title">ทำความสะอาดโรงเรือน</h1>
          <p className="cl-sub">ล้าง ฆ่าเชื้อ และกันโรคเข้าฟาร์ม — ทำตามทีละขั้น ติ๊กไว้ได้เลย</p>
        </div>
      </header>

      <SectionNav sections={SECTIONS} />

      <div className="cl-golden">
        <i className="ti ti-alert-hexagon" aria-hidden="true" />
        <div>
          <b>{GOLDEN_RULE.title}</b>
          <span>{GOLDEN_RULE.body}</span>
        </div>
      </div>

      {/* ล้างโรงเรือน */}
      <section className="cl-sec pnav-target" id="cl-barn">
        <h2 className="cl-sec-title"><i className="ti ti-building-warehouse" aria-hidden="true" /> ล้างโรงเรือนหลังย้ายหมูออก</h2>

        <div className="cl-progress">
          <div className="cl-progress-top">
            <b>ทำไปแล้ว {barnDone} จาก {BARN_STEPS.length} ขั้น</b>
            {barnDone > 0 && (
              <button type="button" className="cl-reset" onClick={resetBarn}>
                <i className="ti ti-refresh" aria-hidden="true" /> เริ่มรอบใหม่
              </button>
            )}
          </div>
          <div className="cl-bar"><span style={{ width: `${pct}%` }} /></div>
          {barnDone === BARN_STEPS.length && (
            <div className="cl-done-all"><i className="ti ti-circle-check" aria-hidden="true" /> ครบทุกขั้นแล้ว พร้อมลงหมูรุ่นใหม่</div>
          )}
        </div>

        <ol className="cl-steps">
          {BARN_STEPS.map((s) => (
            <li key={s.id} className={`cl-step ${done[s.id] ? 'on' : ''}`}>
              <button type="button" className="cl-check" onClick={() => toggle(s.id)}
                aria-pressed={!!done[s.id]} aria-label={`ทำขั้นที่ ${s.n} แล้ว`}>
                <i className={`ti ${done[s.id] ? 'ti-circle-check-filled' : 'ti-circle'}`} aria-hidden="true" />
              </button>
              <div className="cl-step-body">
                <div className="cl-step-top">
                  <span className="cl-step-n">{s.n}</span>
                  <b>{s.title}</b>
                  <span className="cl-step-time"><i className="ti ti-clock" aria-hidden="true" /> {s.time}</span>
                </div>
                <p className="cl-why"><i className="ti ti-bulb" aria-hidden="true" /> {s.why}</p>
                <ul className="cl-dos">
                  {s.dos.map((d) => <li key={d}>{d}</li>)}
                </ul>
              </div>
            </li>
          ))}
        </ol>

        {/* คำนวณวันลงหมูรุ่นใหม่ */}
        <div className="cl-calc">
          <h3><i className="ti ti-calendar-event" aria-hidden="true" /> ลงหมูรุ่นใหม่ได้วันไหน</h3>
          <div className="cl-calc-in">
            <label className="cl-field">
              <span>วันที่ย้ายหมูออก</span>
              <input type="date" className="chat-input cl-date" value={outDate}
                onChange={(e) => setOutDate(e.target.value)} />
            </label>
            <label className="cl-field">
              <span>พักคอกกี่วัน</span>
              <select className="chat-input cl-date" value={restDays}
                onChange={(e) => setRestDays(Number(e.target.value))}>
                <option value={5}>5 วัน (อย่างน้อย)</option>
                <option value={7}>7 วัน (แนะนำ)</option>
                <option value={14}>14 วัน (เคยมีโรคระบาด)</option>
              </select>
            </label>
          </div>

          <div className="cl-timeline">
            {[
              { d: 1, label: 'เก็บมูล ราดน้ำ ฉีดล้าง', icon: 'ti-droplet' },
              { d: 2, label: 'ฟอกน้ำยา ล้างออก ผึ่งให้แห้ง', icon: 'ti-bubble' },
              { d: 3, label: 'พ่นน้ำยาฆ่าเชื้อ ล้างระบบน้ำ', icon: 'ti-shield-check' },
              { d: 3 + restDays, label: 'ลงหมูรุ่นใหม่ได้', icon: 'ti-pig', hi: true },
            ].map((t) => {
              const dd = addDays(outDate, t.d)
              return (
                <div className={`cl-tl ${t.hi ? 'hi' : ''}`} key={t.d}>
                  <i className={`ti ${t.icon}`} aria-hidden="true" />
                  <div>
                    <div className="cl-tl-date">{fmt(dd)}</div>
                    <div className="cl-tl-label">{t.label}</div>
                  </div>
                </div>
              )
            })}
          </div>
          {left != null && (
            <p className="cl-calc-note">
              {left > 0 ? `เหลืออีก ${left} วันก่อนลงหมูรุ่นใหม่` : left === 0 ? 'วันนี้ลงหมูรุ่นใหม่ได้' : `เลยกำหนดลงหมูมาแล้ว ${-left} วัน`}
              {' · '}นับจากวันล้างเสร็จ ไม่ใช่วันย้ายหมูออก
            </p>
          )}
        </div>
      </section>

      {/* ยานพาหนะ */}
      <section className="cl-sec pnav-target" id="cl-vehicle">
        <h2 className="cl-sec-title"><i className="ti ti-truck" aria-hidden="true" /> ล้างและฆ่าเชื้อยานพาหนะ</h2>
        <p className="cl-lead">รถคือทางที่เชื้อเดินทางเร็วที่สุด เพราะวิ่งข้ามหลายฟาร์มได้ในวันเดียว ทุกคันที่จะเข้าเขตเลี้ยงต้องผ่านขั้นตอนนี้</p>

        <div className="cl-vsteps">
          {VEHICLE_STEPS.map((s) => (
            <button type="button" key={s.id} className={`cl-vstep ${done[s.id] ? 'on' : ''}`}
              onClick={() => toggle(s.id)} aria-pressed={!!done[s.id]}>
              <span className="cl-vstep-n">{s.n}</span>
              <span className="cl-vstep-body">
                <b><i className={`ti ${s.icon}`} aria-hidden="true" /> {s.title}</b>
                <small>{s.why}</small>
              </span>
              <i className={`ti ${done[s.id] ? 'ti-circle-check-filled' : 'ti-circle'} cl-vstep-tick`} aria-hidden="true" />
            </button>
          ))}
        </div>
        {vehDone > 0 && <p className="cl-calc-note">ติ๊กไว้ {vehDone} จาก {VEHICLE_STEPS.length} ขั้น</p>}

        <h3 className="cl-sub-title">รถแบบไหนเสี่ยงแค่ไหน</h3>
        <div className="cl-risks">
          {VEHICLE_RISK.map((r) => (
            <div className={`cl-risk ${RISK_TONE[r.level] || 'mid'}`} key={r.label}>
              <div className="cl-risk-top">
                <b>{r.label}</b>
                <span className="cl-risk-badge">{r.level}</span>
              </div>
              <p>{r.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* องค์ประกอบ */}
      <section className="cl-sec pnav-target" id="cl-parts">
        <h2 className="cl-sec-title"><i className="ti ti-shield-check" aria-hidden="true" /> องค์ประกอบที่ต้องมีในระบบความปลอดภัยทางชีวภาพ</h2>
        <p className="cl-lead">ทั้ง 8 อย่างนี้ต้องทำไปพร้อมกัน ถ้าขาดข้อใดข้อหนึ่ง เชื้อจะเข้าทางนั้น แม้ข้ออื่นจะทำดีแค่ไหนก็ตาม</p>

        <div className="cl-parts">
          {COMPONENTS.map((c) => (
            <button type="button" key={c.id} className={`cl-part ${openPart === c.id ? 'on' : ''}`}
              onClick={() => setOpenPart(openPart === c.id ? null : c.id)} aria-expanded={openPart === c.id}>
              <span className="cl-part-icon"><i className={`ti ${c.icon}`} aria-hidden="true" /></span>
              <b>{c.title}</b>
              <small>{c.lead}</small>
              {openPart === c.id && (
                <ul className="cl-part-list">
                  {c.items.map((x) => <li key={x}><i className="ti ti-check" aria-hidden="true" />{x}</li>)}
                </ul>
              )}
              <span className="cl-part-more">{openPart === c.id ? 'ย่อ' : `ดูสิ่งที่ต้องทำ ${c.items.length} ข้อ`}</span>
            </button>
          ))}
        </div>
      </section>

      {/* น้ำยา */}
      <section className="cl-sec pnav-target" id="cl-chem">
        <h2 className="cl-sec-title"><i className="ti ti-flask" aria-hidden="true" /> เลือกน้ำยาฆ่าเชื้อให้ถูกงาน</h2>
        <div className="cl-chems">
          {DISINFECTANTS.map((d) => (
            <div className="cl-chem" key={d.name}>
              <b>{d.name}</b>
              <div className="cl-chem-row use"><i className="ti ti-target" aria-hidden="true" /><span>{d.use}</span></div>
              <div className="cl-chem-row good"><i className="ti ti-thumb-up" aria-hidden="true" /><span>{d.good}</span></div>
              <div className="cl-chem-row care"><i className="ti ti-alert-triangle" aria-hidden="true" /><span>{d.care}</span></div>
            </div>
          ))}
        </div>

        <div className="cl-rules">
          <b><i className="ti ti-list-check" aria-hidden="true" /> กฎการผสมและใช้น้ำยา</b>
          <ul>{MIX_RULES.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      </section>

      {/* งานประจำ */}
      <section className="cl-sec pnav-target" id="cl-routine">
        <h2 className="cl-sec-title"><i className="ti ti-calendar-repeat" aria-hidden="true" /> งานทำความสะอาดประจำ</h2>
        <div className="cl-routines">
          {ROUTINE.map((r) => (
            <div className="cl-routine" key={r.when}>
              <b><i className={`ti ${r.icon}`} aria-hidden="true" /> {r.when}</b>
              <ul>{r.items.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      <p className="cl-source">
        <i className="ti ti-book" aria-hidden="true" />
        {SOURCE_NOTE} · เป็นแนวทางทั่วไป ชนิดและอัตราส่วนน้ำยาให้ยึดตามฉลากและคำแนะนำของสัตวแพทย์ผู้ควบคุมฟาร์ม
      </p>
    </div>
  )
}

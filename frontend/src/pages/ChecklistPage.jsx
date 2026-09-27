import { useEffect, useMemo, useState } from 'react'
import { CHECKS, FREQS, SOURCE_NOTE, SYSTEMS } from '../data/checklist.js'

// หน้า "เช็กลิสต์มาตรฐานฟาร์ม" — 8 ระบบหลัก แยกตามรอบที่ต้องตรวจ
// ใช้เป็นใบตรวจจริง: กดผ่าน/ไม่ผ่านทีละข้อ ข้อที่ไม่ผ่านจะเด้งขึ้นเป็นรายการที่ต้องแก้
// รายวันรีเซ็ตเองเมื่อขึ้นวันใหม่ รายสัปดาห์และรายเดือนก็เช่นกัน ส่วน "ทุกรุ่น" กดเริ่มรอบใหม่เอง

const LS_STATE = 'farmy.checklist.v1'
const LS_ROUND = 'farmy.checklist.round'

const readJson = (k, fallback) => {
  try {
    const v = localStorage.getItem(k)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
const saveJson = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ไม่เป็นไร */ }
}

// สัปดาห์ตามมาตรฐาน ISO — สัปดาห์เริ่มวันจันทร์
const isoWeek = (d) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const start = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((t - start) / 86400000 + 1) / 7)
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

const periodKey = (freq, round) => {
  const now = new Date()
  if (freq === 'daily') return `daily:${now.toLocaleDateString('sv-SE')}`
  if (freq === 'weekly') return `weekly:${isoWeek(now)}`
  if (freq === 'monthly') return `monthly:${now.toLocaleDateString('sv-SE').slice(0, 7)}`
  return `batch:${round}`
}

const periodLabel = (freq) => {
  const now = new Date()
  if (freq === 'daily') return now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })
  if (freq === 'weekly') return `สัปดาห์นี้ · ${isoWeek(now).replace('-W', ' สัปดาห์ที่ ')}`
  if (freq === 'monthly') return now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
  return 'รุ่นปัจจุบัน'
}

const sysOf = (id) => SYSTEMS.find((s) => s.id === id)

export default function ChecklistPage() {
  const [freq, setFreq] = useState('daily')
  const [round, setRound] = useState(() => Number(localStorage.getItem(LS_ROUND) || '1') || 1)
  const [state, setState] = useState(() => readJson(LS_STATE, {}))
  const [openFix, setOpenFix] = useState(null)
  const [sysFilter, setSysFilter] = useState(null)

  useEffect(() => { saveJson(LS_STATE, state) }, [state])
  useEffect(() => { try { localStorage.setItem(LS_ROUND, String(round)) } catch { /* ไม่เป็นไร */ } }, [round])

  const pkey = periodKey(freq, round)
  const marks = state[pkey] || {}

  const setMark = (itemId, value) => {
    setState((prev) => {
      const cur = { ...(prev[pkey] || {}) }
      if (cur[itemId] === value) delete cur[itemId]   // กดซ้ำ = ยกเลิก
      else cur[itemId] = value
      const next = { ...prev, [pkey]: cur }
      // เก็บย้อนหลังไว้พอประมาณ ไม่ให้โตไม่จำกัด
      const keys = Object.keys(next)
      if (keys.length > 40) keys.slice(0, keys.length - 40).forEach((k) => { delete next[k] })
      return next
    })
  }

  const items = useMemo(() => CHECKS.filter((c) => c.freq === freq), [freq])
  const shown = sysFilter ? items.filter((c) => c.sys === sysFilter) : items

  const pass = items.filter((c) => marks[c.id] === 'ok').length
  const failItems = items.filter((c) => marks[c.id] === 'ng')
  const left = items.length - pass - failItems.length
  const pct = items.length ? Math.round((pass / items.length) * 100) : 0

  const newRound = () => { setRound((r) => r + 1); setOpenFix(null) }

  // จัดกลุ่มตามระบบ เพื่อให้เดินตรวจทีละระบบได้
  const grouped = useMemo(() => {
    const g = []
    SYSTEMS.forEach((s) => {
      const list = shown.filter((c) => c.sys === s.id)
      if (list.length) g.push({ sys: s, list })
    })
    return g
  }, [shown])

  const countFor = (f) => CHECKS.filter((c) => c.freq === f).length

  return (
    <div className="ck">
      <header className="ck-head">
        <span className="ck-head-icon"><i className="ti ti-checklist" aria-hidden="true" /></span>
        <div>
          <h1 className="ck-title">เช็กลิสต์มาตรฐานฟาร์ม</h1>
          <p className="ck-sub">8 ระบบหลัก แยกตามรอบที่ต้องตรวจ — กดผ่านหรือไม่ผ่านได้ทีละข้อ</p>
        </div>
      </header>

      {/* เลือกรอบ */}
      <div className="ck-freqs">
        {FREQS.map((f) => (
          <button type="button" key={f.id} className={`ck-freq ${freq === f.id ? 'on' : ''}`}
            onClick={() => { setFreq(f.id); setSysFilter(null); setOpenFix(null) }}>
            <i className={`ti ${f.icon}`} aria-hidden="true" />
            <span>
              <b>{f.label}</b>
              <small>{countFor(f.id)} ข้อ</small>
            </span>
          </button>
        ))}
      </div>

      {/* สรุปของรอบนี้ */}
      <div className="ck-summary">
        <div className="ck-sum-top">
          <div>
            <b className="ck-sum-period">{periodLabel(freq)}</b>
            <small>{FREQS.find((f) => f.id === freq)?.note}</small>
          </div>
          {freq === 'batch' && (
            <button type="button" className="ck-round" onClick={newRound}>
              <i className="ti ti-refresh" aria-hidden="true" /> เริ่มรุ่นใหม่ (รุ่นที่ {round})
            </button>
          )}
        </div>

        <div className="ck-bar">
          <span className="ok" style={{ width: `${pct}%` }} />
          <span className="ng" style={{ width: `${items.length ? (failItems.length / items.length) * 100 : 0}%` }} />
        </div>

        <div className="ck-stats">
          <span className="ok"><i className="ti ti-circle-check" aria-hidden="true" /> ผ่าน {pass}</span>
          <span className="ng"><i className="ti ti-alert-circle" aria-hidden="true" /> ไม่ผ่าน {failItems.length}</span>
          <span className="left"><i className="ti ti-circle" aria-hidden="true" /> ยังไม่ตรวจ {left}</span>
        </div>

        {failItems.length > 0 && (
          <div className="ck-todo">
            <b><i className="ti ti-tools" aria-hidden="true" /> ต้องแก้ไข {failItems.length} ข้อ</b>
            <ul>
              {failItems.map((c) => (
                <li key={c.id}>
                  <span className="ck-todo-sys">{sysOf(c.sys)?.name}</span>
                  <span className="ck-todo-text">{c.text}</span>
                  <span className="ck-todo-fix">{c.fix}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {items.length > 0 && pass === items.length && (
          <div className="ck-allok"><i className="ti ti-mood-check" aria-hidden="true" /> ผ่านครบทุกข้อในรอบนี้</div>
        )}
      </div>

      {/* กรองตามระบบ */}
      <div className="ck-sysbar">
        <button type="button" className={`ck-sysbtn ${!sysFilter ? 'on' : ''}`} onClick={() => setSysFilter(null)}>
          ทุกระบบ
        </button>
        {SYSTEMS.map((s) => {
          const n = items.filter((c) => c.sys === s.id).length
          if (!n) return null
          return (
            <button type="button" key={s.id} className={`ck-sysbtn ${sysFilter === s.id ? 'on' : ''}`}
              onClick={() => setSysFilter(sysFilter === s.id ? null : s.id)}>
              <i className={`ti ${s.icon}`} aria-hidden="true" /> {s.n}. {s.name} <em>{n}</em>
            </button>
          )
        })}
      </div>

      {/* รายการตรวจ */}
      <div className="ck-groups">
        {grouped.map(({ sys, list }) => {
          const gPass = list.filter((c) => marks[c.id] === 'ok').length
          return (
            <section className={`ck-group tone-${sys.tone}`} key={sys.id}>
              <header className="ck-group-head">
                <span className="ck-group-icon"><i className={`ti ${sys.icon}`} aria-hidden="true" /></span>
                <div>
                  <b>{sys.n}. {sys.name}</b>
                  <small>{gPass} / {list.length} ผ่านแล้ว</small>
                </div>
              </header>

              <ul className="ck-items">
                {list.map((c) => {
                  const m = marks[c.id]
                  return (
                    <li key={c.id} className={`ck-item ${m === 'ok' ? 'ok' : ''} ${m === 'ng' ? 'ng' : ''}`}>
                      <div className="ck-item-main">
                        <div className="ck-item-text">
                          <b>{c.text}</b>
                          <small><i className="ti ti-target" aria-hidden="true" /> เกณฑ์: {c.ok}</small>
                        </div>
                        <div className="ck-acts">
                          <button type="button" className={`ck-act ok ${m === 'ok' ? 'on' : ''}`}
                            onClick={() => setMark(c.id, 'ok')} aria-pressed={m === 'ok'}>
                            <i className="ti ti-check" aria-hidden="true" /> ผ่าน
                          </button>
                          <button type="button" className={`ck-act ng ${m === 'ng' ? 'on' : ''}`}
                            onClick={() => { setMark(c.id, 'ng'); setOpenFix(c.id) }} aria-pressed={m === 'ng'}>
                            <i className="ti ti-x" aria-hidden="true" /> ไม่ผ่าน
                          </button>
                        </div>
                      </div>

                      {(m === 'ng' || openFix === c.id) && (
                        <div className="ck-fix">
                          <i className="ti ti-tool" aria-hidden="true" />
                          <span><b>ถ้าไม่ผ่าน:</b> {c.fix}</span>
                        </div>
                      )}
                      {m !== 'ng' && openFix !== c.id && (
                        <button type="button" className="ck-fix-more" onClick={() => setOpenFix(c.id)}>
                          ถ้าไม่ผ่านต้องทำยังไง
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      <p className="ck-source">
        <i className="ti ti-book" aria-hidden="true" />
        {SOURCE_NOTE} · เป็นแนวทางทั่วไป ฟาร์มควรปรับรายการและความถี่ให้ตรงกับระบบของตัวเองร่วมกับสัตวแพทย์ผู้ควบคุมฟาร์ม
      </p>
    </div>
  )
}

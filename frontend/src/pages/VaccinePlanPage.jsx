import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deletePigBatch, deleteVaccineProgram, getBatchPlan, getPigBatches, getVaccinePrograms,
  markPlanDone, savePigBatch, saveVaccineProgram, useDefaultProgram,
} from '../api.js'
import AdminGate from '../components/AdminGate.jsx'

// หน้า "แผนวัคซีนตามอายุ"
// ใส่ 2 อย่าง: (ก) ชุดหมู = วันเกิด + จำนวน + อยู่ไหน  (ข) โปรแกรม = วัคซีนไหน เข็มที่เท่าไหร่ ฉีดตอนอายุกี่วัน
// ระบบคำนวณ "ตารางฉีดทั้งรุ่น" ให้เอง: ทุกเข็มของทุกชุดมีวันครบกำหนด + สถานะ (ฉีดแล้ว/เลยกำหนด/ใกล้ถึง/ยังไม่ถึง)
// กด "ฉีดแล้ว" ที่แผน = สร้างบันทึกการฉีดให้ครบ ไม่ต้องกรอกเอง · LINE เตือนทุกเช้าเมื่อใกล้ถึง

const todayStr = () => new Date().toLocaleDateString('sv-SE')
const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}
// อายุเป็นวันอ่านยาก → แปลงเป็น "9 สัปดาห์ 1 วัน" / "3 เดือน"
// ใช้หน่วยที่ฟาร์มพูดกันจริง: 42 → "6 สัปดาห์", 60 → "2 เดือน", 365 → "1 ปี"
const fmtAge = (days) => {
  if (days == null) return '—'
  if (days < 0) return 'ยังไม่เกิด'
  if (days % 365 === 0) return `${days / 365} ปี`
  if (days % 30 === 0 && days >= 30) return `${days / 30} เดือน`
  if (days % 7 === 0 && days >= 14) return `${days / 7} สัปดาห์`
  if (days < 14) return `${days} วัน`
  if (days < 90) { const w = Math.floor(days / 7), d = days % 7; return `${w} สัปดาห์${d ? ` ${d} วัน` : ''}` }
  const m = Math.floor(days / 30), d = days % 30
  return `${m} เดือน${d ? ` ${d} วัน` : ''}`
}
const BARNS = ['โรงเรือน 1', 'โรงเรือน 2', 'โรงเรือน 3', 'โรงเรือน 4', 'โรงเรือน 5']
const PENS = Array.from({ length: 10 }, (_, i) => `คอก ${i + 1}`)
const ROUTES = [{ id: 'IM', label: 'IM เข้ากล้าม' }, { id: 'SQ', label: 'SQ ใต้ผิวหนัง' }, { id: 'spray', label: 'พ่นละออง' }, { id: 'oral', label: 'ทางปาก' }, { id: 'water', label: 'ผ่านน้ำดื่ม' }]
// ตัวช่วยกรอกอายุ: กดเลือกแล้วแปลงเป็นวันให้
const AGE_PRESETS = [
  { label: '3 วัน', days: 3 }, { label: '1 สัปดาห์', days: 7 }, { label: '3 สัปดาห์', days: 21 }, { label: '1 เดือน', days: 30 },
  { label: '2 เดือน', days: 60 }, { label: '3 เดือน', days: 90 }, { label: '4 เดือน', days: 120 }, { label: '6 เดือน', days: 180 },
]
const STATUS = {
  done: { label: 'ฉีดแล้ว', tone: 'ok', icon: 'ti-circle-check' },
  overdue: { label: 'เลยกำหนด', tone: 'bad', icon: 'ti-alert-triangle' },
  due: { label: 'ใกล้ถึง', tone: 'watch', icon: 'ti-bell-ringing' },
  upcoming: { label: 'ยังไม่ถึง', tone: '', icon: 'ti-clock' },
}

export default function VaccinePlanPage() {
  const [tick, setTick] = useState(0)
  const [batches, setBatches] = useState([])
  const [programs, setPrograms] = useState(null)
  const [plan, setPlan] = useState(null)
  const [filterBatch, setFilterBatch] = useState('')
  const [hideDone, setHideDone] = useState(false)
  const [msg, setMsg] = useState('')
  const refresh = () => setTick((t) => t + 1)

  useEffect(() => {
    let alive = true
    getPigBatches().then((d) => alive && setBatches(d?.rows || [])).catch(() => {})
    getVaccinePrograms().then((d) => alive && setPrograms(d)).catch(() => alive && setPrograms({ rows: [], default: [] }))
    getBatchPlan(7).then((d) => alive && setPlan(d)).catch(() => alive && setPlan({ rows: [], summary: {} }))
    return () => { alive = false }
  }, [tick])

  const rows = useMemo(() => (plan?.rows || []).filter((r) => (!filterBatch || String(r.batch_id) === filterBatch) && (!hideDone || r.status !== 'done')), [plan, filterBatch, hideDone])
  const sum = plan?.summary || {}

  // เพิ่มชุดเสร็จ → กรองแผนไปชุดนั้นเลย ผู้ใช้เห็นทันทีว่าระบบสร้างอะไรให้
  const onBatchAdded = (row) => { if (row?.id) setFilterBatch(String(row.id)); setMsg(`เพิ่มชุด "${row?.name}" แล้ว — นี่คือแผนฉีดทั้งรุ่นของชุดนี้`); refresh() }
  // เข็มถัดไปของแต่ละชุด (ที่ยังไม่ฉีด) — สิ่งเดียวที่คนงานต้องรู้ในแต่ละวัน
  const nextPerBatch = useMemo(() => {
    const m = new Map()
    for (const r of plan?.rows || []) if (r.status !== 'done' && !m.has(r.batch_id)) m.set(r.batch_id, r)
    return [...m.values()].sort((a, b) => a.days_left - b.days_left)
  }, [plan])

  const done = async (r) => {
    if (!window.confirm(`บันทึกว่าฉีด ${r.vaccine_name} ${r.label} ให้ ${r.batch_name} (${r.pig_count ?? '?'} ตัว) วันนี้?`)) return
    try { await markPlanDone(r.batch_id, r.program_id, r.booster_no); setMsg(`บันทึก ${r.batch_name} ${r.vaccine_name} ${r.label} แล้ว`); refresh() }
    catch (e) { setMsg(e?.detail || 'บันทึกไม่สำเร็จ') }
  }

  return (
    <div className="vp">
      <header className="vp-head">
        <span className="vp-head-icon"><i className="ti ti-calendar-time" aria-hidden="true" /></span>
        <div>
          <h1 className="vp-title">แผนวัคซีนตามอายุ</h1>
          <p className="vp-sub">ใส่วันเกิดชุดหมู + โปรแกรมของฟาร์ม → ระบบสร้างตารางฉีดทั้งรุ่นให้ และเตือนก่อนถึงกำหนด</p>
        </div>
        <Link to="/vaccine" className="btn-clear vp-link"><i className="ti ti-clipboard-text" aria-hidden="true" /> หน้าบันทึกวัคซีน</Link>
      </header>

      {/* สรุป */}
      <div className="vp-sum">
        {[['overdue', 'เลยกำหนด'], ['due', 'ใกล้ถึง (7 วัน)'], ['upcoming', 'ยังไม่ถึง'], ['done', 'ฉีดแล้ว']].map(([k, l]) => (
          <div className={`vp-sum-item ${STATUS[k].tone}`} key={k}>
            <i className={`ti ${STATUS[k].icon}`} aria-hidden="true" />
            <b>{sum[k] ?? '—'}</b><span>{l}</span>
          </div>
        ))}
      </div>

      {/* ต้องทำต่อไป — การ์ดละชุด */}
      {nextPerBatch.length > 0 && (
        <div className="vp-next">
          {nextPerBatch.map((r) => {
            const st = STATUS[r.status]
            return (
              <div className={`vp-next-card ${r.status}`} key={r.batch_id}>
                <div className="vp-next-batch">{r.batch_name} <span className="vp-dim">· อายุ {fmtAge(r.batch_age_days)} · {r.pig_count ?? '?'} ตัว</span></div>
                <div className="vp-next-shot"><i className={`ti ${st.icon}`} aria-hidden="true" /> {r.vaccine_name} {r.label}</div>
                <div className="vp-next-when">{r.days_left === 0 ? 'วันนี้' : r.days_left > 0 ? `อีก ${r.days_left} วัน` : `เลยมา ${-r.days_left} วัน`} <span className="vp-dim">({fmtDate(r.due_date)})</span></div>
                {r.status !== 'upcoming' && <AdminGate><button className="ask-btn vp-done" type="button" onClick={() => done(r)}><i className="ti ti-check" aria-hidden="true" /> ฉีดแล้ว</button></AdminGate>}
              </div>
            )
          })}
        </div>
      )}

      <div className="vp-grid">
        <AdminGate>
          <BatchPanel batches={batches} onChanged={refresh} onAdded={onBatchAdded} />
          <ProgramPanel programs={programs} onChanged={refresh} />
        </AdminGate>
      </div>

      {/* ตารางแผน */}
      <div className="panel vp-plan">
        <div className="vp-sec-head">
          <i className="ti ti-list-check" aria-hidden="true" />
          <span className="vp-sec-title">ตารางฉีดทั้งรุ่น <small>{rows.length} เข็ม</small></span>
          <div className="vp-tools">
            <select className="chat-input" value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)}>
              <option value="">ทุกชุด</option>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <label className="vp-check"><input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> ซ่อนที่ฉีดแล้ว</label>
          </div>
        </div>
        {msg && <div className="vp-msg">{msg}</div>}
        {!plan ? <div className="empty-note">กำลังโหลด…</div> : rows.length === 0 ? (
          <div className="empty-note">
            {batches.length === 0 ? 'ยังไม่มีชุดหมู — เพิ่มชุดหมูก่อน' : !programs?.rows?.length ? 'ยังไม่มีโปรแกรมวัคซีน — กด "ใช้โปรแกรมตั้งต้น" หรือเพิ่มเอง' : 'ไม่มีรายการ'}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table vp-table">
              <thead><tr><th>ครบกำหนด</th><th>ชุดหมู</th><th>วัคซีน</th><th>เข็ม</th><th>อายุตอนฉีด</th><th>วิธี · โดส</th><th>สถานะ</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const st = STATUS[r.status]
                  return (
                    <tr key={`${r.batch_id}-${r.program_id}-${r.booster_no}`} className={`vp-row ${r.status}`}>
                      <td><b>{fmtDate(r.due_date)}</b><div className="vp-dim">{r.status === 'done' ? `ฉีด ${fmtDate(r.done_date)}` : r.days_left === 0 ? 'วันนี้' : r.days_left > 0 ? `อีก ${r.days_left} วัน` : `เลยมา ${-r.days_left} วัน`}</div></td>
                      <td>{r.batch_name}<div className="vp-dim">{[r.barn_no, r.pen_no].filter(Boolean).join(' · ') || '—'} · {r.pig_count ?? '?'} ตัว · อายุ {fmtAge(r.batch_age_days)}</div></td>
                      <td><b>{r.vaccine_name}</b></td>
                      <td>{r.label}</td>
                      <td>{fmtAge(r.age_at_days)}<div className="vp-dim">{r.age_at_days} วัน</div></td>
                      <td>{r.route || '—'}{r.dose && <div className="vp-dim">{r.dose}</div>}</td>
                      <td><span className={`vp-pill ${st.tone}`}><i className={`ti ${st.icon}`} aria-hidden="true" /> {st.label}</span></td>
                      <td>{r.status !== 'done' && (
                        <AdminGate>
                          <button className="ask-btn vp-done" type="button" onClick={() => done(r)}><i className="ti ti-check" aria-hidden="true" /> ฉีดแล้ว</button>
                        </AdminGate>
                      )}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="vp-foot"><i className="ti ti-bell" aria-hidden="true" /> LINE เตือนทุกเช้า 07:00 เมื่อมีเข็มถึงกำหนดใน 7 วันหรือเลยกำหนด · ถาม AI ได้ว่า "ชุดไหนต้องฉีดอะไรบ้าง"</div>
      </div>
    </div>
  )
}

// ---------- ชุดหมู ----------
function BatchPanel({ batches, onChanged, onAdded }) {
  const EMPTY = { name: '', birth_date: '', age_weeks: '', age_days: '', barn_no: '', pen_no: '', pig_count: '', note: '' }
  const [f, setF] = useState(EMPTY)
  // คนงานมักรู้ "อายุ" มากกว่า "วันเกิด" → ให้ใส่ได้ทั้งสองแบบ ระบบคำนวณอีกอันให้
  const [mode, setMode] = useState('age')
  const birthFromAge = () => {
    const d = (Number(f.age_weeks) || 0) * 7 + (Number(f.age_days) || 0)
    return new Date(Date.now() - d * 864e5).toLocaleDateString('sv-SE')
  }
  const [open, setOpen] = useState(batches.length === 0)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  // ยังไม่มีชุด → เปิดฟอร์มรอไว้เลย · มีแล้วพับเก็บ (กดเพิ่มชุดเมื่ออยากใส่)
  useEffect(() => { setOpen(batches.length === 0) }, [batches.length])

  const submit = async (e) => {
    e.preventDefault()
    const birth = mode === 'age' ? birthFromAge() : f.birth_date
    if (mode === 'age' && f.age_weeks === '' && f.age_days === '') return
    if (!birth) return
    // ไม่ตั้งชื่อก็ได้ — ตั้งให้จากวันเกิด
    const name = f.name.trim() || `ชุดเกิด ${fmtDate(birth)}`
    try {
      const row = await savePigBatch({ name, birth_date: birth, barn_no: f.barn_no || null, pen_no: f.pen_no || null, pig_count: f.pig_count === '' ? null : Number(f.pig_count), note: f.note || null })
      setF(EMPTY); setErr(''); onAdded ? onAdded(row) : onChanged()
    } catch (x) { setErr(x?.detail || 'บันทึกไม่สำเร็จ') }
  }
  const remove = async (b) => { if (window.confirm(`ลบชุด "${b.name}"? (แผนของชุดนี้จะหายไปด้วย)`)) { await deletePigBatch(b.id).catch(() => {}); onChanged() } }

  return (
    <div className="panel vp-sec">
      <div className="vp-sec-head">
        <i className="ti ti-pig" aria-hidden="true" />
        <span className="vp-sec-title">ชุดหมู <small>{batches.length} ชุด</small></span>
        <button type="button" className="btn-clear vp-add" onClick={() => setOpen((o) => !o)}><i className={`ti ${open ? 'ti-x' : 'ti-plus'}`} aria-hidden="true" /> {open ? 'ปิด' : 'เพิ่มชุด'}</button>
      </div>
      {open && (
        <form className="pig-form vp-form" onSubmit={submit}>
          <div className="vp-mode">
            <button type="button" className={`chip ${mode === 'age' ? 'chip-on' : ''}`} onClick={() => setMode('age')}>ใส่อายุตอนนี้</button>
            <button type="button" className={`chip ${mode === 'birth' ? 'chip-on' : ''}`} onClick={() => setMode('birth')}>ใส่วันเกิด</button>
          </div>
          <div className="pig-form-row">
            {mode === 'age' ? (
              <>
                <label className="pig-form-field vp-narrow"><span>อายุ (สัปดาห์) *</span><input type="number" min="0" className="chat-input" value={f.age_weeks} onChange={set('age_weeks')} placeholder="เช่น 3" /></label>
                <label className="pig-form-field vp-narrow"><span>+ วัน</span><input type="number" min="0" max="6" className="chat-input" value={f.age_days} onChange={set('age_days')} placeholder="0" /></label>
                <div className="pig-form-field"><span>วันเกิดโดยประมาณ</span><div className="vp-calc">{(f.age_weeks !== '' || f.age_days !== '') ? fmtDate(birthFromAge()) : '—'}</div></div>
              </>
            ) : (
              <label className="pig-form-field"><span>วันเกิด *</span><input type="date" className="chat-input" value={f.birth_date} max={todayStr()} onChange={set('birth_date')} /></label>
            )}
            <label className="pig-form-field"><span>ชื่อชุด / รุ่น</span><input className="chat-input" value={f.name} onChange={set('name')} placeholder="ว่างได้ — ตั้งให้จากวันเกิด" /></label>
          </div>
          <div className="pig-form-row">
            <label className="pig-form-field"><span>โรงเรือน</span><select className="chat-input" value={f.barn_no} onChange={set('barn_no')}><option value="">—</option>{BARNS.map((b) => <option key={b}>{b}</option>)}</select></label>
            <label className="pig-form-field"><span>คอก</span><select className="chat-input" value={f.pen_no} onChange={set('pen_no')}><option value="">—</option>{PENS.map((b) => <option key={b}>{b}</option>)}</select></label>
            <label className="pig-form-field"><span>จำนวน (ตัว)</span><input type="number" min="1" className="chat-input" value={f.pig_count} onChange={set('pig_count')} /></label>
          </div>
          <div className="pig-form-actions">
            <button className="ask-btn" type="submit"><i className="ti ti-device-floppy" aria-hidden="true" /> เพิ่มชุดหมู → สร้างแผนให้เลย</button>
            {err && <span className="pig-form-msg">{err}</span>}
          </div>
          <div className="vp-voice-tip"><i className="ti ti-microphone" aria-hidden="true" /> พูดก็ได้: “เพิ่มชุดหมู อายุ 3 สัปดาห์ 40 ตัว โรงเรือน 2”</div>
        </form>
      )}
      <div className="vp-list">
        {batches.length === 0 ? <div className="empty-note">ยังไม่มีชุดหมู</div> : batches.map((b) => (
          <div className="vp-item" key={b.id}>
            <div>
              <b>{b.name}</b> <span className="vp-dim">· {b.pig_count ?? '?'} ตัว · {[b.barn_no, b.pen_no].filter(Boolean).join(' ') || 'ไม่ระบุที่'}</span>
              <div className="vp-dim">เกิด {fmtDate(b.birth_date)} · อายุตอนนี้ <b>{fmtAge(b.age_days)}</b></div>
            </div>
            <button className="pager-btn" onClick={() => remove(b)} title="ลบ"><i className="ti ti-trash" aria-hidden="true" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- โปรแกรมวัคซีน ----------
function ProgramPanel({ programs, onChanged }) {
  const EMPTY = { vaccine_name: '', dose_no: '1', age_days: '', route: '', dose: '', repeat_days: '', note: '' }
  const [f, setF] = useState(EMPTY)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [err, setErr] = useState('')
  const rows = programs?.rows || []
  // รวมเป็นสายโซ่ต่อวัคซีน: "เข็ม 1 อายุ 2 เดือน → เข็ม 2 อายุ 3 เดือน → ซ้ำทุก 6 เดือน"
  const chains = useMemo(() => {
    const m = new Map()
    for (const r of rows) { if (!m.has(r.vaccine_name)) m.set(r.vaccine_name, []); m.get(r.vaccine_name).push(r) }
    return [...m.entries()].map(([name, list]) => ({ name, list: list.sort((a, b) => a.age_days - b.age_days) }))
  }, [rows])
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!f.vaccine_name.trim() || f.age_days === '') return
    try {
      await saveVaccineProgram({ vaccine_name: f.vaccine_name.trim(), dose_no: Number(f.dose_no) || 1, age_days: Number(f.age_days), route: f.route || null, dose: f.dose || null, repeat_days: f.repeat_days === '' ? null : Number(f.repeat_days), note: f.note || null })
      setF({ ...EMPTY, vaccine_name: f.vaccine_name, dose_no: String((Number(f.dose_no) || 1) + 1) }); setErr(''); onChanged()
    } catch (x) { setErr(x?.detail || 'บันทึกไม่สำเร็จ') }
  }
  const useDefault = async () => { try { await useDefaultProgram(); onChanged() } catch (x) { setErr(x?.detail || 'ใส่ไม่สำเร็จ') } }
  const remove = async (p) => { if (window.confirm(`ลบ ${p.vaccine_name} เข็มที่ ${p.dose_no}?`)) { await deleteVaccineProgram(p.id).catch(() => {}); onChanged() } }

  return (
    <div className="panel vp-sec">
      <div className="vp-sec-head">
        <i className="ti ti-vaccine" aria-hidden="true" />
        <span className="vp-sec-title">โปรแกรมวัคซีนของฟาร์ม <small>{chains.length} วัคซีน · {rows.length} เข็ม</small></span>
        <button type="button" className="btn-clear vp-add" onClick={() => { setEditing((e) => !e); setOpen(false) }}><i className={`ti ${editing ? 'ti-check' : 'ti-pencil'}`} aria-hidden="true" /> {editing ? 'เสร็จ' : 'แก้ไข'}</button>
      </div>
      {!editing && chains.length > 0 && (
        <div className="vp-chains">
          {chains.map((c) => (
            <div className="vp-chain" key={c.name}>
              <div className="vp-chain-name"><i className="ti ti-vaccine" aria-hidden="true" /> {c.name}</div>
              <div className="vp-chain-steps">
                {c.list.map((r, i) => (
                  <span key={r.id} className="vp-step-wrap">
                    {i > 0 && <i className="ti ti-arrow-right vp-arrow" aria-hidden="true" />}
                    <span className="vp-step"><b>เข็ม {r.dose_no}</b> อายุ {fmtAge(r.age_days)}</span>
                  </span>
                ))}
                {c.list.some((r) => r.repeat_days) && <span className="vp-step-wrap"><i className="ti ti-arrow-right vp-arrow" aria-hidden="true" /><span className="vp-step repeat"><i className="ti ti-repeat" aria-hidden="true" /> ซ้ำทุก {fmtAge(c.list.find((r) => r.repeat_days).repeat_days)}</span></span>}
              </div>
            </div>
          ))}
          <div className="vp-dim vp-chain-note">โปรแกรมมาตรฐานของฟาร์ม — กด "แก้ไข" เพื่อเพิ่มวัคซีนหรือเปลี่ยนอายุ</div>
        </div>
      )}
      {editing && (
        <div className="vp-edit-bar"><button type="button" className="btn-clear vp-add" onClick={() => setOpen((o) => !o)}><i className={`ti ${open ? 'ti-x' : 'ti-plus'}`} aria-hidden="true" /> {open ? 'ปิดฟอร์ม' : 'เพิ่มเข็ม'}</button></div>
      )}
      {programs && rows.length === 0 && (
        <div className="vp-default">
          <div>ยังไม่มีโปรแกรม — ใส่โปรแกรมมาตรฐานของฟาร์ม (ปากเท้าเปื่อย 2 เดือน/3 เดือน ซ้ำทุก 6 เดือน · อหิวาต์ 6/12 สัปดาห์ ซ้ำทุกปี)</div>
          <button className="ask-btn" type="button" onClick={useDefault}><i className="ti ti-sparkles" aria-hidden="true" /> ใช้โปรแกรมมาตรฐาน</button>
        </div>
      )}
      {open && (
        <form className="pig-form vp-form" onSubmit={submit}>
          <div className="pig-form-row">
            <label className="pig-form-field"><span>วัคซีน *</span><input className="chat-input" value={f.vaccine_name} onChange={set('vaccine_name')} placeholder="เช่น FMD, PRRS" required /></label>
            <label className="pig-form-field vp-narrow"><span>เข็มที่</span><input type="number" min="1" className="chat-input" value={f.dose_no} onChange={set('dose_no')} /></label>
            <label className="pig-form-field vp-narrow"><span>อายุที่ฉีด (วัน) *</span><input type="number" min="0" className="chat-input" value={f.age_days} onChange={set('age_days')} required /></label>
          </div>
          <div className="chip-row">
            {AGE_PRESETS.map((a) => <button type="button" key={a.days} className={`chip ${String(f.age_days) === String(a.days) ? 'chip-on' : ''}`} onClick={() => setF((x) => ({ ...x, age_days: String(a.days) }))}>{a.label}</button>)}
          </div>
          <div className="pig-form-row">
            <label className="pig-form-field"><span>วิธีให้</span><select className="chat-input" value={f.route} onChange={set('route')}><option value="">—</option>{ROUTES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
            <label className="pig-form-field"><span>โดส</span><input className="chat-input" value={f.dose} onChange={set('dose')} placeholder="เช่น 2 มล./ตัว" /></label>
            <label className="pig-form-field"><span>กระตุ้นซ้ำทุก (วัน)</span><input type="number" min="0" className="chat-input" value={f.repeat_days} onChange={set('repeat_days')} placeholder="ว่าง = ไม่กระตุ้น" /></label>
          </div>
          <div className="pig-form-actions">
            <button className="ask-btn" type="submit"><i className="ti ti-device-floppy" aria-hidden="true" /> เพิ่มเข้าโปรแกรม</button>
            {err && <span className="pig-form-msg">{err}</span>}
          </div>
        </form>
      )}
      {editing && <div className="vp-list">
        {rows.map((p) => (
          <div className="vp-item" key={p.id}>
            <div>
              <b>{p.vaccine_name}</b> <span className="vp-pill">เข็มที่ {p.dose_no}</span>
              <div className="vp-dim">ฉีดตอนอายุ <b>{fmtAge(p.age_days)}</b> ({p.age_days} วัน){p.route ? ` · ${p.route}` : ''}{p.dose ? ` · ${p.dose}` : ''}{p.repeat_days ? ` · กระตุ้นทุก ${p.repeat_days} วัน` : ''}</div>
            </div>
            <button className="pager-btn" onClick={() => remove(p)} title="ลบ"><i className="ti ti-trash" aria-hidden="true" /></button>
          </div>
        ))}
      </div>}
    </div>
  )
}

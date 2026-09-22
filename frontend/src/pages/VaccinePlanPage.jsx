import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deletePigBatch, deleteVaccineProgram, getBatchPlan, getPigBatches, getVaccinePrograms,
  markPlanDone, savePigBatch, saveVaccineProgram, useDefaultProgram,
} from '../api.js'
import AdminGate from '../components/AdminGate.jsx'

// หน้า "ตารางฉีดวัคซีนตามอายุ"
// เลือกชุดหมู → 4 ตัวเลขใหญ่ (เกิด · อายุ · นัดถัดไป · เตือน)
// ซ้าย = สร้างชุด/แผน · กลาง = โปรแกรม (การ์ดใหญ่) + ตารางแผนของชุดนั้น · ขวา = การแจ้งเตือน
// ตัวหนังสือน้อย ตัวเลขใหญ่ — สิ่งที่ต้องรู้คือ "ชุดไหน ฉีดอะไร อีกกี่วัน"

const todayStr = () => new Date().toLocaleDateString('sv-SE')
const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
const fmtDateShort = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}
// ใช้หน่วยที่ฟาร์มพูดกันจริง: 42 → "6 สัปดาห์", 60 → "2 เดือน", 365 → "1 ปี"
const fmtAge = (days) => {
  if (days == null) return '—'
  if (days < 0) return 'ยังไม่เกิด'
  if (days > 0 && days % 365 === 0) return `${days / 365} ปี`
  if (days % 30 === 0 && days >= 30) return `${days / 30} เดือน`
  if (days % 7 === 0 && days >= 14) return `${days / 7} สัปดาห์`
  if (days < 14) return `${days} วัน`
  if (days < 90) { const w = Math.floor(days / 7), d = days % 7; return `${w} สัปดาห์${d ? ` ${d} วัน` : ''}` }
  const m = Math.floor(days / 30), d = days % 30
  return `${m} เดือน${d ? ` ${d} วัน` : ''}`
}
const shortName = (name = '') => name.replace(/\s*\(.*\)$/, '')
const daysLeftText = (n) => (n === 0 ? 'วันนี้' : n > 0 ? `อีก ${n} วัน` : `เลยมา ${-n} วัน`)
const BARNS = ['โรงเรือน 1', 'โรงเรือน 2', 'โรงเรือน 3', 'โรงเรือน 4', 'โรงเรือน 5']
const PENS = Array.from({ length: 10 }, (_, i) => `คอก ${i + 1}`)
const ROUTES = ['IM', 'SQ', 'spray', 'oral', 'water']
const AGE_PRESETS = [
  { label: 'เกิดวันนี้', days: 0 }, { label: '3 วัน', days: 3 }, { label: '1 สัปดาห์', days: 7 }, { label: '3 สัปดาห์', days: 21 }, { label: '6 สัปดาห์', days: 42 },
  { label: '2 เดือน', days: 60 }, { label: '12 สัปดาห์', days: 84 }, { label: '3 เดือน', days: 90 }, { label: '6 เดือน', days: 180 },
]
const STATUS = {
  done: { label: 'เสร็จแล้ว', tone: 'ok', icon: 'ti-circle-check-filled' },
  overdue: { label: 'เลยกำหนด', tone: 'bad', icon: 'ti-alert-circle-filled' },
  due: { label: 'ใกล้ถึงกำหนด', tone: 'watch', icon: 'ti-clock-filled' },
  upcoming: { label: 'รอฉีด', tone: '', icon: 'ti-clock' },
}
// สีประจำวัคซีน — การ์ดโปรแกรมแยกกันได้ด้วยตา
const vaxTone = (name = '') => (/อหิวา|csf/i.test(name) ? 'blue' : /prrs/i.test(name) ? 'purple' : 'green')

export default function VaccinePlanPage() {
  const [tick, setTick] = useState(0)
  const [batches, setBatches] = useState([])
  const [programs, setPrograms] = useState(null)
  const [plan, setPlan] = useState(null)
  const [sel, setSel] = useState('')          // ชุดที่กำลังดู
  const [editProgram, setEditProgram] = useState(false)
  const [msg, setMsg] = useState('')
  const refresh = () => setTick((t) => t + 1)
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 5000) }

  useEffect(() => {
    let alive = true
    getPigBatches().then((d) => alive && setBatches(d?.rows || [])).catch(() => {})
    getVaccinePrograms().then((d) => alive && setPrograms(d)).catch(() => alive && setPrograms({ rows: [] }))
    getBatchPlan(7).then((d) => alive && setPlan(d)).catch(() => alive && setPlan({ rows: [], summary: {} }))
    return () => { alive = false }
  }, [tick])
  // ยังไม่ได้เลือก → เลือกชุดที่มีเข็มใกล้ถึงที่สุด (แผนเรียงตามวันครบกำหนดอยู่แล้ว)
  useEffect(() => {
    if (sel || !plan?.rows?.length) return
    const next = plan.rows.find((r) => r.status !== 'done') || plan.rows[0]
    if (next) setSel(String(next.batch_id))
  }, [plan, sel])

  const batch = batches.find((b) => String(b.id) === sel) || null
  const rows = useMemo(() => (plan?.rows || []).filter((r) => String(r.batch_id) === sel), [plan, sel])
  const next = rows.find((r) => r.status !== 'done') || null
  const chains = useMemo(() => {
    const m = new Map()
    for (const r of programs?.rows || []) { if (!m.has(r.vaccine_name)) m.set(r.vaccine_name, []); m.get(r.vaccine_name).push(r) }
    // เรียงชื่อแบบไทย → ปากเท้าเปื่อยมาก่อนอหิวาต์ ตามลำดับที่ฟาร์มใช้
    return [...m.entries()].map(([name, list]) => ({ name, list: list.sort((a, b) => a.age_days - b.age_days) })).sort((a, b) => a.name.localeCompare(b.name, 'th'))
  }, [programs])
  // เข็มที่ต้องจัดการ (ทุกชุด) — ไว้โชว์ที่ช่องแจ้งเตือน
  const alerts = useMemo(() => (plan?.rows || []).filter((r) => r.status === 'due' || r.status === 'overdue'), [plan])

  const done = async (r) => {
    if (!window.confirm(`ฉีด ${shortName(r.vaccine_name)} ${r.label} ให้ ${r.batch_name} วันนี้ ใช่ไหม?`)) return
    try { await markPlanDone(r.batch_id, r.program_id, r.booster_no); flash('บันทึกแล้ว ✓'); refresh() }
    catch (e) { flash(e?.detail || 'บันทึกไม่สำเร็จ') }
  }
  const onAdded = (row) => { setSel(String(row?.id || '')); flash(`สร้างแผนให้ "${row?.name}" แล้ว ✓`); refresh() }
  const removeBatch = async () => {
    if (!batch || !window.confirm(`ลบชุด "${batch.name}" และแผนของชุดนี้?`)) return
    await deletePigBatch(batch.id).catch(() => {}); setSel(''); refresh()
  }

  return (
    <div className="vq">
      <header className="vq-head">
        <span className="vq-head-icon"><i className="ti ti-vaccine" aria-hidden="true" /></span>
        <div>
          <h1 className="vq-title">ตารางฉีดวัคซีนตามอายุ</h1>
          <p className="vq-sub">ใส่วันเกิดชุดหมู ระบบจัดโปรแกรมให้ทันทีว่าต้องฉีดอะไรวันไหน และเตือนก่อน 7 · 3 · 1 วัน</p>
        </div>
        <img src="/guide/piglet.webp" alt="" className="vq-pig" />
      </header>

      {/* เลือกชุดหมู */}
      <div className="vq-batches">
        {batches.map((b) => {
          const n = (plan?.rows || []).find((r) => r.batch_id === b.id && r.status !== 'done')
          const tone = n ? STATUS[n.status].tone : 'ok'
          return (
            <button type="button" key={b.id} className={`vq-batch ${String(b.id) === sel ? 'on' : ''}`} onClick={() => setSel(String(b.id))}>
              <i className="ti ti-pig" aria-hidden="true" />
              <span className="vq-batch-name">{b.name}</span>
              <span className="vq-batch-sub">{fmtAge(b.age_days)} · {b.pig_count ?? '?'} ตัว</span>
              {n && n.status !== 'upcoming' && <span className={`vq-dot ${tone}`} />}
            </button>
          )
        })}
        {batches.length === 0 && <div className="vq-empty-chip"><i className="ti ti-arrow-down-left" aria-hidden="true" /> ยังไม่มีชุดหมู — สร้างจากช่อง "สร้างแผนฉีดวัคซีน"</div>}
      </div>

      {/* 4 ตัวเลขใหญ่ของชุดที่เลือก */}
      <div className="vq-tiles">
        <div className="vq-tile">
          <span className="vq-tile-icon green"><i className="ti ti-calendar" aria-hidden="true" /></span>
          <div><div className="vq-tile-label">วันเกิดชุดหมู</div><div className="vq-tile-big">{batch ? fmtDate(batch.birth_date) : '—'}</div>{batch && <div className="vq-tile-sub">{[batch.barn_no, batch.pen_no].filter(Boolean).join(' · ') || batch.name}</div>}</div>
        </div>
        <div className="vq-tile">
          <span className="vq-tile-icon green"><i className="ti ti-pig" aria-hidden="true" /></span>
          <div><div className="vq-tile-label">อายุปัจจุบัน</div><div className="vq-tile-big">{batch ? fmtAge(batch.age_days) : '—'}</div>{batch && <div className="vq-tile-sub">{batch.pig_count ?? '?'} ตัว</div>}</div>
        </div>
        <div className={`vq-tile ${next ? next.status : ''}`}>
          <span className="vq-tile-icon amber"><i className="ti ti-vaccine" aria-hidden="true" /></span>
          <div><div className="vq-tile-label">นัดถัดไป</div><div className="vq-tile-big amber">{next ? daysLeftText(next.days_left) : batch ? 'ครบแล้ว' : '—'}</div>{next && <div className="vq-tile-sub"><b>{fmtDate(next.due_date)}</b> · {shortName(next.vaccine_name)} {next.label}</div>}</div>
        </div>
        <div className={`vq-tile ${alerts.length ? 'overdue' : ''}`}>
          <span className="vq-tile-icon red"><i className="ti ti-bell-ringing" aria-hidden="true" /></span>
          <div><div className="vq-tile-label">แจ้งเตือนก่อนถึง</div><div className="vq-tile-big red">{alerts.length ? `${alerts.length} รายการ` : '7 · 3 · 1 วัน'}</div><div className="vq-tile-sub">{alerts.length ? 'ถึงกำหนดใน 7 วัน (ทุกชุด)' : 'LINE อัตโนมัติ + วันฉีด'}</div></div>
        </div>
      </div>

      {msg && <div className="vq-msg">{msg}</div>}

      <div className="vq-grid">
        {/* ซ้าย: สร้างแผน */}
        <AdminGate>
          <CreatePanel onAdded={onAdded} chains={chains} />
        </AdminGate>

        {/* กลาง: โปรแกรม + แผนของชุด */}
        <div className="vq-mid">
          <div className="panel vq-sec">
            <div className="vq-sec-head"><i className="ti ti-vaccine" aria-hidden="true" /> โปรแกรมวัคซีน
              <AdminGate><button type="button" className="vq-link" onClick={() => setEditProgram((e) => !e)}>{editProgram ? 'ปิด' : 'แก้ไข'}</button></AdminGate>
            </div>
            {chains.length === 0 ? (
              <div className="empty-note">ยังไม่มีโปรแกรม</div>
            ) : (
              <div className="vq-programs">
                {chains.map((c) => {
                  const rep = c.list.find((r) => r.repeat_days)
                  return (
                    <div className={`vq-program ${vaxTone(c.name)}`} key={c.name}>
                      <div className="vq-program-name"><i className="ti ti-pig" aria-hidden="true" /><b>{shortName(c.name)}</b></div>
                      <div className="vq-doses">
                        {c.list.map((r) => (
                          <div className="vq-dose" key={r.id}><i className="ti ti-vaccine" aria-hidden="true" /><span>เข็ม {r.dose_no}</span><b>{fmtAge(r.age_days)}</b></div>
                        ))}
                        {rep && <div className="vq-dose"><i className="ti ti-repeat" aria-hidden="true" /><span>กระตุ้นซ้ำ</span><b>ทุก {fmtAge(rep.repeat_days)}</b></div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {editProgram && <AdminGate><ProgramEditor programs={programs} onChanged={refresh} /></AdminGate>}
          </div>

          <div className="panel vq-sec">
            <div className="vq-sec-head"><i className="ti ti-list-check" aria-hidden="true" /> แผนฉีด{batch ? ` · ${batch.name}` : ''}
              {batch && <AdminGate><button type="button" className="vq-link danger" onClick={removeBatch}>ลบชุด</button></AdminGate>}
            </div>
            {!batch ? <div className="empty-note">เลือกชุดหมูด้านบน หรือสร้างชุดใหม่</div> : rows.length === 0 ? <div className="empty-note">ยังไม่มีแผน — ตรวจว่ามีโปรแกรมวัคซีน</div> : (
              <div className="table-wrap">
                <table className="data-table vq-table">
                  <thead><tr><th>อายุสัตว์</th><th>วัคซีน</th><th>เข็มที่</th><th>กำหนดฉีด</th><th>สถานะ</th><th /></tr></thead>
                  <tbody>
                    {rows.map((r) => {
                      const st = STATUS[r.status]
                      return (
                        <tr key={`${r.program_id}-${r.booster_no}`} className={`vq-row ${r.status}`}>
                          <td><b>{fmtAge(r.age_at_days)}</b></td>
                          <td><span className={`vq-vax ${vaxTone(r.vaccine_name)}`}>{shortName(r.vaccine_name)}</span></td>
                          <td>{r.label}</td>
                          <td><b>{fmtDateShort(r.due_date)}</b><div className="vq-dim">{r.status === 'done' ? `ฉีด ${fmtDateShort(r.done_date)}` : daysLeftText(r.days_left)}</div></td>
                          <td><span className={`vq-pill ${st.tone}`}><i className={`ti ${st.icon}`} aria-hidden="true" /> {st.label}</span></td>
                          <td>{r.status !== 'done' && r.status !== 'upcoming' && <AdminGate><button className="ask-btn vq-done" type="button" onClick={() => done(r)}><i className="ti ti-check" aria-hidden="true" /> ฉีดแล้ว</button></AdminGate>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ขวา: แจ้งเตือน */}
        <div className="panel vq-sec vq-alerts">
          <div className="vq-sec-head"><i className="ti ti-bell" aria-hidden="true" /> การแจ้งเตือน</div>
          {alerts.length > 0 && (
            <div className="vq-alert-list">
              {alerts.map((r) => (
                <button type="button" key={`${r.batch_id}-${r.program_id}-${r.booster_no}`} className={`vq-alert-item ${r.status}`} onClick={() => setSel(String(r.batch_id))}>
                  <b>{daysLeftText(r.days_left)}</b><span>{r.batch_name} · {shortName(r.vaccine_name)} {r.label}</span>
                </button>
              ))}
            </div>
          )}
          <div className="vq-alert"><span className="vq-alert-icon"><i className="ti ti-calendar-event" aria-hidden="true" /></span><div><b>ก่อนฉีด 7 · 3 · 1 วัน</b><small>เตือนล่วงหน้า 3 ครั้ง</small></div></div>
          <div className="vq-alert"><span className="vq-alert-icon"><i className="ti ti-alarm" aria-hidden="true" /></span><div><b>วันฉีด + เลยกำหนด</b><small>เตือนทุกเช้าจนกว่าจะกด “ฉีดแล้ว”</small></div></div>
          <div className="vq-alert"><span className="vq-alert-icon line"><i className="ti ti-brand-line" aria-hidden="true" /></span><div><b>ผ่าน LINE</b><small>07:00 น. อัตโนมัติ</small></div></div>
          <div className="vq-alert"><span className="vq-alert-icon"><i className="ti ti-microphone" aria-hidden="true" /></span><div><b>ถาม AI ได้</b><small>“ชุดไหนต้องฉีดอะไร”</small></div></div>
          <Link to="/vaccine" className="btn-clear vq-go"><i className="ti ti-clipboard-text" aria-hidden="true" /> หน้าบันทึกวัคซีน</Link>
        </div>
      </div>
    </div>
  )
}

// ---------- สร้างชุด + แผน ----------
function CreatePanel({ onAdded, chains }) {
  const EMPTY = { name: '', birth_date: '', age_weeks: '', age_days: '', barn_no: '', pen_no: '', pig_count: '' }
  const [f, setF] = useState(EMPTY)
  const [mode, setMode] = useState('age')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const ageDays = (Number(f.age_weeks) || 0) * 7 + (Number(f.age_days) || 0)
  const birth = mode === 'age' ? new Date(Date.now() - ageDays * 864e5).toLocaleDateString('sv-SE') : f.birth_date
  const ready = mode === 'age' ? (f.age_weeks !== '' || f.age_days !== '') : !!f.birth_date
  // ตั้งชื่ออัตโนมัติจากวันเกิด ผู้ใช้ไม่ต้องคิดชื่อเอง (ใส่ทีละชุดไปเรื่อย ๆ ได้)
  const autoName = ready ? `ชุดเกิด ${fmtDateShort(birth)}` : ''

  const submit = async (e) => {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true); setErr('')
    try {
      const name = f.name.trim() || autoName
      const row = await savePigBatch({ name, birth_date: birth, barn_no: f.barn_no || null, pen_no: f.pen_no || null, pig_count: f.pig_count === '' ? null : Number(f.pig_count) })
      setF(EMPTY); onAdded(row)
    } catch (x) { setErr(x?.detail || 'สร้างไม่สำเร็จ') } finally { setBusy(false) }
  }

  return (
    <form className="panel vq-sec vq-create" onSubmit={submit}>
      <div className="vq-sec-head"><i className="ti ti-settings" aria-hidden="true" /> สร้างแผนฉีดวัคซีน</div>
      <div className="vq-mode">
        <button type="button" className={`chip ${mode === 'age' ? 'chip-on' : ''}`} onClick={() => setMode('age')}>รู้อายุตอนนี้</button>
        <button type="button" className={`chip ${mode === 'birth' ? 'chip-on' : ''}`} onClick={() => setMode('birth')}>รู้วันเกิด</button>
      </div>
      {mode === 'age' ? (
        <>
          <div className="vq-age">
            <label><span>สัปดาห์</span><input type="number" min="0" className="chat-input" value={f.age_weeks} onChange={set('age_weeks')} placeholder="0" /></label>
            <label><span>วัน</span><input type="number" min="0" max="6" className="chat-input" value={f.age_days} onChange={set('age_days')} placeholder="0" /></label>
          </div>
          <div className="chip-row vq-presets">
            {AGE_PRESETS.map((a) => <button type="button" key={a.days} className={`chip ${ready && ageDays === a.days ? 'chip-on' : ''}`} onClick={() => setF((x) => ({ ...x, age_weeks: String(Math.floor(a.days / 7)), age_days: String(a.days % 7) }))}>{a.label}</button>)}
          </div>
          {ready && <div className="vq-calc">วันเกิด ≈ <b>{fmtDate(birth)}</b></div>}
        </>
      ) : (
        <label className="vq-field"><span>วันเกิดชุดหมู</span><div className="vq-birth"><input type="date" className="chat-input" value={f.birth_date} max={todayStr()} onChange={set('birth_date')} /><button type="button" className="chip" onClick={() => setF((x) => ({ ...x, birth_date: todayStr() }))}>วันนี้</button></div></label>
      )}
      <div className="vq-two">
        <label className="vq-field"><span>โรงเรือน</span><select className="chat-input" value={f.barn_no} onChange={set('barn_no')}><option value="">—</option>{BARNS.map((b) => <option key={b}>{b}</option>)}</select></label>
        <label className="vq-field"><span>คอก</span><select className="chat-input" value={f.pen_no} onChange={set('pen_no')}><option value="">—</option>{PENS.map((b) => <option key={b}>{b}</option>)}</select></label>
      </div>
      <div className="vq-two">
        <label className="vq-field"><span>จำนวนตัว</span><input type="number" min="1" className="chat-input" value={f.pig_count} onChange={set('pig_count')} placeholder="เช่น 40" /></label>
        <label className="vq-field"><span>ชื่อชุด (ว่างได้)</span><input className="chat-input" value={f.name} onChange={set('name')} placeholder={autoName || 'ตั้งให้อัตโนมัติ'} /></label>
      </div>
      <div className="vq-field"><span>โปรแกรมวัคซีน</span><div className="vq-readonly"><i className="ti ti-check" aria-hidden="true" /> {chains.map((c) => shortName(c.name)).join(' + ') || 'มาตรฐานฟาร์ม'}</div></div>
      <div className="vq-auto"><i className="ti ti-bell-ringing" aria-hidden="true" /> เตือนอัตโนมัติก่อนฉีด 7 · 3 · 1 วัน</div>
      <button className="ask-btn vq-create-btn" type="submit" disabled={!ready || busy}><i className="ti ti-wand" aria-hidden="true" /> {busy ? 'กำลังสร้าง…' : 'สร้างแผนฉีดอัตโนมัติ'}</button>
      {err && <div className="pig-form-msg">{err}</div>}
      <div className="vq-voice"><i className="ti ti-microphone" aria-hidden="true" /> หรือพูด “เพิ่มชุดหมู อายุ 3 สัปดาห์ 40 ตัว โรงเรือน 2”</div>
    </form>
  )
}

// ---------- แก้ไขโปรแกรม (ซ่อนไว้ กด "แก้ไข" ค่อยโผล่) ----------
function ProgramEditor({ programs, onChanged }) {
  const EMPTY = { vaccine_name: '', dose_no: '1', age_days: '', route: 'IM', repeat_days: '' }
  const [f, setF] = useState(EMPTY)
  const [err, setErr] = useState('')
  const rows = programs?.rows || []
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    if (!f.vaccine_name.trim() || f.age_days === '') return
    try {
      await saveVaccineProgram({ vaccine_name: f.vaccine_name.trim(), dose_no: Number(f.dose_no) || 1, age_days: Number(f.age_days), route: f.route || null, dose: null, repeat_days: f.repeat_days === '' ? null : Number(f.repeat_days) })
      setF({ ...EMPTY, vaccine_name: f.vaccine_name, dose_no: String((Number(f.dose_no) || 1) + 1) }); setErr(''); onChanged()
    } catch (x) { setErr(x?.detail || 'บันทึกไม่สำเร็จ') }
  }
  const remove = async (p) => { if (window.confirm(`ลบ ${p.vaccine_name} เข็มที่ ${p.dose_no}?`)) { await deleteVaccineProgram(p.id).catch(() => {}); onChanged() } }
  const useDefault = async () => { try { await useDefaultProgram(); onChanged() } catch (x) { setErr(x?.detail || 'ใส่ไม่สำเร็จ') } }

  return (
    <div className="vq-editor">
      {rows.map((p) => (
        <div className="vq-edit-row" key={p.id}>
          <span><b>{shortName(p.vaccine_name)}</b> เข็ม {p.dose_no} · อายุ {fmtAge(p.age_days)}{p.repeat_days ? ` · ซ้ำทุก ${fmtAge(p.repeat_days)}` : ''}</span>
          <button className="pager-btn" type="button" onClick={() => remove(p)} title="ลบ"><i className="ti ti-trash" aria-hidden="true" /></button>
        </div>
      ))}
      {rows.length === 0 && <button className="btn-clear" type="button" onClick={useDefault}><i className="ti ti-sparkles" aria-hidden="true" /> ใส่โปรแกรมมาตรฐานของฟาร์ม</button>}
      <form className="vq-edit-form" onSubmit={submit}>
        <input className="chat-input" value={f.vaccine_name} onChange={set('vaccine_name')} placeholder="ชื่อวัคซีน" required />
        <input type="number" min="1" className="chat-input vq-w60" value={f.dose_no} onChange={set('dose_no')} title="เข็มที่" />
        <input type="number" min="0" className="chat-input vq-w90" value={f.age_days} onChange={set('age_days')} placeholder="อายุ (วัน)" required />
        <input type="number" min="0" className="chat-input vq-w110" value={f.repeat_days} onChange={set('repeat_days')} placeholder="ซ้ำทุก (วัน)" />
        <select className="chat-input vq-w60" value={f.route} onChange={set('route')}>{ROUTES.map((r) => <option key={r}>{r}</option>)}</select>
        <button className="ask-btn" type="submit"><i className="ti ti-plus" aria-hidden="true" /> เพิ่ม</button>
      </form>
      {err && <div className="pig-form-msg">{err}</div>}
    </div>
  )
}

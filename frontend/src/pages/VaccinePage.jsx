import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  deleteVaccineProduct, getVaccineHistory, getVaccineProducts, getVaccineStats,
  saveVaccineLog, saveVaccineProduct, sendVaccineReportToLine,
} from '../api.js'
import AdminGate from '../components/AdminGate.jsx'
import VaccineDuePanel from '../components/VaccineDuePanel.jsx'
import VaccineFollowup from '../components/VaccineFollowup.jsx'
import usePolling from '../hooks/usePolling.js'
import { apiUrl } from '../config.js'
import { createRecognizer, pickBestTranscript } from '../utils/speech.js'

// หน้า "บันทึกข้อมูลวัคซีนในฟาร์มสุกร" — ครบ 4 หมวดตามมาตรฐานการบันทึกวัคซีน
//   ① ทะเบียนวัคซีน (ล็อต วันหมดอายุ ผู้ผลิต)   → ตรวจย้อนหลังตอนเกิดโรค / เอกสาร GAP
//   ② การให้วัคซีน (วิธีให้ โดส อาการหลังฉีด)     → ความปลอดภัยสัตว์
//   ③ สุกรที่ได้รับ (หมายเลขหู คอก จำนวน เพศ อายุ)  → ใครได้แล้ว ใครยังไม่ได้
//   ④ ผู้ฉีดและการติดตาม (ผู้ฉีด ภูมิคุ้มกัน นัดซ้ำ) → รับผิดชอบได้ ตามผลได้
// ② ③ ④ คือฟอร์มเดียวกัน (บันทึกการฉีด 1 ครั้ง) แยกเป็น 3 การ์ดให้กรอกเป็นลำดับ

const todayStr = () => new Date().toLocaleDateString('sv-SE')
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toLocaleDateString('sv-SE')
const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
}

const BARNS = ['โรงเรือน 1', 'โรงเรือน 2', 'โรงเรือน 3', 'โรงเรือน 4', 'โรงเรือน 5']
const PENS = Array.from({ length: 10 }, (_, i) => `คอก ${i + 1}`)
const ROUTES = [
  { id: 'IM', label: 'IM เข้ากล้าม' }, { id: 'SQ', label: 'SQ ใต้ผิวหนัง' }, { id: 'spray', label: 'พ่นละออง' },
  { id: 'oral', label: 'ทางปาก' }, { id: 'water', label: 'ผ่านน้ำดื่ม' },
]
const REACTIONS = [
  { id: 'normal', label: 'ปกติ' }, { id: 'fever', label: 'มีไข้' }, { id: 'lethargy', label: 'ซึม' },
  { id: 'swelling', label: 'บวม' }, { id: 'other', label: 'อื่น ๆ' },
]
const STAGES = ['ลูกสุกร', 'สุกรรุ่น', 'สุกรขุน', 'แม่พันธุ์ก่อนคลอด', 'แม่พันธุ์หลังคลอด', 'พ่อพันธุ์']
const PIG_STATUS = [{ id: 'normal', label: 'ปกติ' }, { id: 'sick', label: 'ป่วย' }, { id: 'treating', label: 'กำลังรักษา' }]
const ANTIBODY = [{ id: 'none', label: 'ไม่ได้ตรวจ' }, { id: 'pending', label: 'รอผล' }, { id: 'positive', label: 'มีภูมิ (Positive)' }, { id: 'negative', label: 'ไม่มีภูมิ (Negative)' }]
const DISEASES = ['ปากและเท้าเปื่อย (FMD)', 'PRRS', 'อหิวาต์สุกร (CSF)', 'เซอร์โคไวรัส (Circo)', 'ไมโคพลาสมา', 'อี.โคไล', 'พาร์โวไวรัส', 'พิษสุนัขบ้า']

const label = (list, id) => list.find((x) => x.id === id)?.label || id || '—'
const statusTone = (s) => ({ normal: 'ok', sick: 'bad', treating: 'watch' }[s] || '')

// ---------- ชิปเลือกค่า ใช้ซ้ำทุกหมวด ----------
function Chips({ options, value, onChange, allowClear = true }) {
  return (
    <div className="chip-row">
      {options.map((o) => {
        const id = typeof o === 'string' ? o : o.id
        const text = typeof o === 'string' ? o : o.label
        const on = value === id
        return (
          <button type="button" key={id} className={`chip ${on ? 'chip-on' : ''}`}
            onClick={() => onChange(on && allowClear ? '' : id)}>{text}</button>
        )
      })}
    </div>
  )
}

// ---------- ช่องข้อความที่พูดใส่ได้ (ใช้กับ "ระบุอาการ") ----------
// กดไมค์ครั้งแรกเริ่มฟัง ข้อความไหลเข้าช่องสด ๆ กดอีกครั้งหยุด — พิมพ์แก้ต่อได้เลย
function DictateInput({ value, onChange, placeholder }) {
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  const baseRef = useRef('')
  const toggle = () => {
    if (recRef.current) { recRef.current.stop(); return }
    const r = createRecognizer()
    if (!r) { alert('เบราว์เซอร์นี้ไม่รองรับการฟังเสียง ใช้ Chrome / Edge'); return }
    recRef.current = r
    baseRef.current = value ? value.trim() + ' ' : ''
    r.onresult = (e) => onChange(baseRef.current + pickBestTranscript(e.results))
    r.onerror = () => { recRef.current = null; setListening(false) }
    r.onend = () => { recRef.current = null; setListening(false) }
    try { r.start(); setListening(true) } catch { recRef.current = null }
  }
  useEffect(() => () => recRef.current?.stop(), [])
  return (
    <div className={`vx-dictate ${listening ? 'on' : ''}`}>
      <input className="chat-input" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={listening ? 'กำลังฟัง... พูดได้เลย' : placeholder} />
      <button type="button" className={`vx-mic ${listening ? 'on' : ''}`} onClick={toggle}
        title={listening ? 'หยุดฟัง' : 'พูดใส่'} aria-label={listening ? 'หยุดฟัง' : 'พูดใส่'}>
        <i className={`ti ${listening ? 'ti-player-stop-filled' : 'ti-microphone'}`} aria-hidden="true" />
      </button>
    </div>
  )
}

// ---------- แถบตัวเลขบนหัว ----------
function StatTiles({ stats }) {
  const s = stats || {}
  const tiles = [
    { icon: 'ti-vaccine', tone: 'green', label: 'รายการวัคซีนในทะเบียน', value: s.products ?? '—', unit: 'รายการ',
      sub: s.products_new_month ? `+${s.products_new_month} ในเดือนนี้` : 'ล็อตที่ใช้อยู่' },
    { icon: 'ti-pig', tone: 'pink', label: 'สุกรที่ฉีดวันนี้', value: s.pigs_today ?? '—', unit: 'ตัว',
      sub: s.pigs_today_delta > 0 ? `↑ +${s.pigs_today_delta} จากเมื่อวาน` : s.pigs_today_delta < 0 ? `↓ ${s.pigs_today_delta} จากเมื่อวาน` : 'เท่าเมื่อวาน' },
    { icon: 'ti-calendar-event', tone: 'amber', label: 'นัดฉีดซ้ำใน 7 วัน', value: s.due_pigs ?? '—', unit: 'ตัว',
      sub: s.due_items ? `${s.due_items} รายการใกล้ถึงกำหนด` : 'ไม่มีนัดใกล้ถึง' },
    { icon: 'ti-alert-triangle', tone: 'red', label: 'อาการหลังฉีดผิดปกติ', value: s.abnormal_pigs ?? '—', unit: 'ตัว',
      sub: s.pending_followups ? `ต้องไปตรวจอีก ${s.pending_followups} รายการ` : 'ตรวจครบแล้ว', alert: (s.abnormal_pigs || 0) > 0 },
  ]
  return (
    <div className="vx-stats">
      {tiles.map((t) => (
        <div className={`vx-stat ${t.alert ? 'alert' : ''}`} key={t.label}>
          <span className={`vx-stat-icon ${t.tone}`}><i className={`ti ${t.icon}`} aria-hidden="true" /></span>
          <div className="vx-stat-body">
            <div className="vx-stat-label">{t.label}</div>
            <div className="vx-stat-value">{t.value} <small>{t.unit}</small></div>
            <div className={`vx-stat-sub ${t.alert ? 'bad' : ''}`}>{t.sub}</div>
          </div>
        </div>
      ))}
      <div className="vx-motto">
        <img src="/guide/piglet.webp" alt="" />
        <div>“ สุกรแข็งแรง<br />ฟาร์มก้าวไกล<br />ด้วยข้อมูลที่เชื่อถือได้ ”</div>
      </div>
    </div>
  )
}

// ---------- ① ทะเบียนวัคซีน ----------
function ProductsPanel({ products, onChanged, isAdmin }) {
  const EMPTY = { name: '', disease: '', lot_no: '', mfg_date: '', exp_date: '', manufacturer: '', distributor: '', route: '', dose: '' }
  const [open, setOpen] = useState(false)
  const [f, setF] = useState(EMPTY)
  const [msg, setMsg] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!f.name.trim()) return
    try {
      await saveVaccineProduct({
        name: f.name.trim(), disease: f.disease || null, lot_no: f.lot_no || null,
        mfg_date: f.mfg_date || null, exp_date: f.exp_date || null,
        manufacturer: f.manufacturer || null, distributor: f.distributor || null,
        route: f.route || null, dose: f.dose || null,
      })
      setF(EMPTY); setOpen(false); setMsg(''); onChanged()
    } catch (err) { setMsg(err?.detail || 'บันทึกไม่สำเร็จ') }
  }
  const remove = async (p) => {
    if (!window.confirm(`ลบ ${p.name} ล็อต ${p.lot_no || '-'} ออกจากทะเบียน?`)) return
    try { await deleteVaccineProduct(p.id); onChanged() } catch { setMsg('ลบไม่สำเร็จ') }
  }

  return (
    <div className="panel vx-sec" id="vx-s1">
      <div className="vx-sec-head">
        <span className="vx-num">1</span>
        <i className="ti ti-vaccine" aria-hidden="true" />
        <span className="vx-sec-title">ข้อมูลวัคซีน <small>ทะเบียนล็อตที่ใช้ในฟาร์ม</small></span>
        {isAdmin && (
          <button type="button" className="btn-clear vx-add" onClick={() => setOpen((o) => !o)}>
            <i className={`ti ${open ? 'ti-x' : 'ti-plus'}`} aria-hidden="true" /> {open ? 'ปิด' : 'เพิ่มรายการ'}
          </button>
        )}
      </div>

      {open && (
        <form className="pig-form vx-form" onSubmit={submit}>
          <div className="pig-form-row">
            <label className="pig-form-field"><span>ชื่อวัคซีน *</span>
              <input className="chat-input" value={f.name} onChange={set('name')} placeholder="เช่น FMD, PRRS" required /></label>
            <label className="pig-form-field"><span>ชนิดโรค</span>
              <input className="chat-input" list="vx-diseases" value={f.disease} onChange={set('disease')} placeholder="เลือกหรือพิมพ์" />
              <datalist id="vx-diseases">{DISEASES.map((d) => <option key={d} value={d} />)}</datalist></label>
            <label className="pig-form-field"><span>เลขที่ล็อต (Lot No.)</span>
              <input className="chat-input" value={f.lot_no} onChange={set('lot_no')} placeholder="เช่น FMD240301" /></label>
          </div>
          <div className="pig-form-row">
            <label className="pig-form-field"><span>วันที่ผลิต</span>
              <input type="date" className="chat-input" value={f.mfg_date} onChange={set('mfg_date')} /></label>
            <label className="pig-form-field"><span>วันหมดอายุ</span>
              <input type="date" className="chat-input" value={f.exp_date} onChange={set('exp_date')} /></label>
            <label className="pig-form-field"><span>บริษัทผู้ผลิต</span>
              <input className="chat-input" value={f.manufacturer} onChange={set('manufacturer')} placeholder="เช่น Zoetis" /></label>
            <label className="pig-form-field"><span>ผู้จำหน่าย</span>
              <input className="chat-input" value={f.distributor} onChange={set('distributor')} /></label>
          </div>
          <div className="pig-form-row">
            <div className="pig-form-field"><span>วิธีให้ตามฉลาก</span><Chips options={ROUTES} value={f.route} onChange={(v) => setF((x) => ({ ...x, route: v }))} /></div>
            <label className="pig-form-field"><span>โดสตามฉลาก</span>
              <input className="chat-input" value={f.dose} onChange={set('dose')} placeholder="เช่น 2 มล./ตัว" /></label>
          </div>
          <div className="pig-form-actions">
            <button className="ask-btn" type="submit"><i className="ti ti-device-floppy" aria-hidden="true" /> บันทึกทะเบียน</button>
            {msg && <span className="pig-form-msg">{msg}</span>}
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table className="data-table vx-table">
          <thead><tr><th>ชื่อวัคซีน / ชนิดโรค</th><th>เลขที่ล็อต</th><th>วันที่ผลิต</th><th>วันหมดอายุ</th><th>ผู้ผลิต / ผู้จำหน่าย</th><th>วิธีให้ · โดส</th>{isAdmin && <th />}</tr></thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={isAdmin ? 7 : 6} className="td-empty">ยังไม่มีทะเบียนวัคซีน — กด "เพิ่มรายการ" ใส่ล็อตที่ใช้อยู่</td></tr>
            ) : products.map((p) => {
              const d = p.days_to_expire
              const expTone = d == null ? '' : d < 0 ? 'bad' : d <= 60 ? 'watch' : 'ok'
              return (
                <tr key={p.id}>
                  <td><b>{p.name}</b>{p.disease && <div className="vx-dim">{p.disease}</div>}</td>
                  <td className="vx-mono">{p.lot_no || '—'}</td>
                  <td>{fmtDate(p.mfg_date)}</td>
                  <td>
                    <span className={`vx-pill ${expTone}`}>{fmtDate(p.exp_date)}</span>
                    {d != null && d < 0 && <div className="vx-dim bad">หมดอายุแล้ว</div>}
                    {d != null && d >= 0 && d <= 60 && <div className="vx-dim watch">อีก {d} วัน</div>}
                  </td>
                  <td>{p.manufacturer || '—'}{p.distributor && <div className="vx-dim">{p.distributor}</div>}</td>
                  <td>{label(ROUTES, p.route)}{p.dose && <div className="vx-dim">{p.dose}</div>}</td>
                  {isAdmin && <td><button className="pager-btn" onClick={() => remove(p)}><i className="ti ti-trash" aria-hidden="true" /></button></td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------- ② ③ ④ ฟอร์มบันทึกการฉีด 1 ครั้ง ----------
function RecordForm({ products, onSaved, presetVaccine }) {
  const EMPTY = {
    log_date: todayStr(), log_time: '', product_id: '', vaccine_name: '', lot_no: '', route: '', dose: '', reaction: 'normal', reaction_note: '', next_due_date: '',
    pig_ids: '', barn_no: '', pen_no: '', pig_count: '', male_count: '', female_count: '', age_stage: '', pig_status: 'normal',
    injector: '', antibody_result: 'none', note: '',
  }
  const [f, setF] = useState({ ...EMPTY, vaccine_name: presetVaccine || '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const setV = (k) => (v) => setF((x) => ({ ...x, [k]: v }))

  // เลือกจากทะเบียน → เติมชื่อ/ล็อต/วิธีให้/โดส ให้เลย
  const pickProduct = (e) => {
    const id = e.target.value
    const p = products.find((x) => String(x.id) === id)
    setF((x) => ({ ...x, product_id: id, vaccine_name: p ? p.name : x.vaccine_name, lot_no: p?.lot_no || x.lot_no, route: p?.route || x.route, dose: p?.dose || x.dose }))
  }
  // นับเพศแล้วรวมให้ ถ้ายังไม่ได้กรอกจำนวนรวม
  const total = (Number(f.male_count) || 0) + (Number(f.female_count) || 0)

  const submit = async (e) => {
    e.preventDefault()
    if (!f.log_date) return
    setSaving(true); setMsg('')
    try {
      await saveVaccineLog({
        log_date: f.log_date, log_time: f.log_time || null,
        product_id: f.product_id ? Number(f.product_id) : null,
        vaccine_name: f.vaccine_name.trim() || null, lot_no: f.lot_no.trim() || null,
        route: f.route || null, dose: f.dose.trim() || null, reaction: f.reaction || null,
        reaction_note: f.reaction !== 'normal' && f.reaction_note.trim() ? f.reaction_note.trim() : null,
        next_due_date: f.next_due_date || null,
        pig_ids: f.pig_ids.trim() || null, barn_no: f.barn_no || null, pen_no: f.pen_no || null,
        pig_count: f.pig_count !== '' ? Number(f.pig_count) : (total || null),
        male_count: f.male_count !== '' ? Number(f.male_count) : null,
        female_count: f.female_count !== '' ? Number(f.female_count) : null,
        age_stage: f.age_stage || null, pig_status: f.pig_status || null,
        injector: f.injector.trim() || null, antibody_result: f.antibody_result || null,
        note: f.note.trim() || null,
      })
      setMsg('บันทึกแล้ว — ระบบจะเตือนตรวจอาการวันที่ 1, 3, 7 และนัดฉีดซ้ำให้')
      setF({ ...EMPTY, log_date: f.log_date, injector: f.injector })
      onSaved()
    } catch (err) {
      setMsg(err?.detail || 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally { setSaving(false) }
  }

  return (
    <form className="vx-record" onSubmit={submit}>
      {/* ② */}
      <div className="panel vx-sec" id="vx-s2">
        <div className="vx-sec-head"><span className="vx-num">2</span><i className="ti ti-syringe" aria-hidden="true" /><span className="vx-sec-title">ข้อมูลการให้วัคซีน</span></div>
        <div className="pig-form vx-form">
          <div className="pig-form-row">
            <label className="pig-form-field"><span>วันที่ฉีด *</span>
              <input type="date" className="chat-input" value={f.log_date} max={todayStr()} onChange={set('log_date')} required /></label>
            <label className="pig-form-field"><span>เวลา</span>
              <input type="time" className="chat-input" value={f.log_time} onChange={set('log_time')} /></label>
            <label className="pig-form-field"><span>วันที่ฉีดซ้ำ / บูสต์</span>
              <input type="date" className="chat-input" value={f.next_due_date} onChange={set('next_due_date')} />
              <small className="vx-hint">ว่างไว้ = คำนวณจากรอบที่ตั้งไว้</small></label>
          </div>
          <div className="pig-form-row">
            <label className="pig-form-field"><span>วัคซีนจากทะเบียน</span>
              <select className="chat-input" value={f.product_id} onChange={pickProduct}>
                <option value="">— เลือก หรือพิมพ์ชื่อเอง —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.lot_no ? ` · ล็อต ${p.lot_no}` : ''}{p.days_to_expire != null && p.days_to_expire < 0 ? ' (หมดอายุ!)' : ''}</option>)}
              </select></label>
            <label className="pig-form-field"><span>ชื่อวัคซีน / ยา</span>
              <input className="chat-input" value={f.vaccine_name} onChange={set('vaccine_name')} placeholder="เช่น FMD" /></label>
            <label className="pig-form-field"><span>เลขที่ล็อต</span>
              <input className="chat-input" value={f.lot_no} onChange={set('lot_no')} /></label>
          </div>
          <div className="pig-form-row">
            <div className="pig-form-field"><span>ชนิดการให้</span><Chips options={ROUTES} value={f.route} onChange={setV('route')} /></div>
            <label className="pig-form-field vx-narrow"><span>ขนาดยา (โดส/ตัว)</span>
              <input className="chat-input" value={f.dose} onChange={set('dose')} placeholder="เช่น 2 มล." /></label>
          </div>
          <div className="pig-form-field"><span>อาการทันทีหลังฉีด</span><Chips options={REACTIONS} value={f.reaction} onChange={setV('reaction')} allowClear={false} />
            {f.reaction !== 'normal' && (
              <>
                {/* เลือก "อื่น ๆ" ต้องบอกว่าคืออะไร · เลือกอาการอื่นก็ขยายความได้ — พิมพ์หรือกดไมค์พูดใส่ */}
                <DictateInput value={f.reaction_note} onChange={setV('reaction_note')}
                  placeholder={f.reaction === 'other' ? 'ระบุอาการ เช่น ตัวสั่น หายใจถี่ ตกใจง่าย (พิมพ์หรือกดไมค์พูด)' : 'รายละเอียดเพิ่มเติม เช่น บวมเท่าเหรียญบาท 3 ตัว (ไม่บังคับ)'} />
                <small className="vx-hint warn"><i className="ti ti-alert-triangle" aria-hidden="true" /> พบอาการ — ระบบจะขึ้นในช่อง "อาการหลังฉีดผิดปกติ" และเตือนตรวจซ้ำ</small>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ③ */}
      <div className="panel vx-sec" id="vx-s3">
        <div className="vx-sec-head"><span className="vx-num">3</span><i className="ti ti-pig" aria-hidden="true" /><span className="vx-sec-title">ข้อมูลสุกรที่ได้รับวัคซีน</span></div>
        <div className="pig-form vx-form">
          <label className="pig-form-field"><span>หมายเลขหู / เลขประจำตัวสุกร</span>
            <input className="chat-input" value={f.pig_ids} onChange={set('pig_ids')} placeholder="เช่น TH1256801, TH1256802 (ว่างได้ถ้าฉีดทั้งคอก)" /></label>
          <div className="pig-form-row">
            <label className="pig-form-field"><span>โรงเรือน</span>
              <select className="chat-input" value={f.barn_no} onChange={set('barn_no')}><option value="">—</option>{BARNS.map((b) => <option key={b}>{b}</option>)}</select></label>
            <label className="pig-form-field"><span>คอก</span>
              <select className="chat-input" value={f.pen_no} onChange={set('pen_no')}><option value="">—</option>{PENS.map((b) => <option key={b}>{b}</option>)}</select></label>
            <label className="pig-form-field"><span>ผู้ (ตัว)</span>
              <input type="number" min="0" className="chat-input" value={f.male_count} onChange={set('male_count')} /></label>
            <label className="pig-form-field"><span>เมีย (ตัว)</span>
              <input type="number" min="0" className="chat-input" value={f.female_count} onChange={set('female_count')} /></label>
            <label className="pig-form-field"><span>รวม (ตัว)</span>
              <input type="number" min="0" className="chat-input" value={f.pig_count} onChange={set('pig_count')} placeholder={total ? String(total) : ''} /></label>
          </div>
          <div className="pig-form-row">
            <div className="pig-form-field"><span>อายุ / ระยะการผลิต</span><Chips options={STAGES} value={f.age_stage} onChange={setV('age_stage')} /></div>
          </div>
          <div className="pig-form-field"><span>สถานะสุกร</span><Chips options={PIG_STATUS} value={f.pig_status} onChange={setV('pig_status')} allowClear={false} />
            {f.pig_status !== 'normal' && <small className="vx-hint warn">สุกรป่วย/กำลังรักษา ปกติจะงดฉีด — ถ้าจดไว้เพื่อฉีดชดเชย ใส่วันที่ในหมายเหตุ</small>}
          </div>
        </div>
      </div>

      {/* ④ */}
      <div className="panel vx-sec" id="vx-s4">
        <div className="vx-sec-head"><span className="vx-num">4</span><i className="ti ti-user-check" aria-hidden="true" /><span className="vx-sec-title">ข้อมูลผู้ฉีดและการติดตาม</span></div>
        <div className="pig-form vx-form">
          <div className="pig-form-row">
            <label className="pig-form-field"><span>ชื่อผู้ฉีด / ผู้บันทึก</span>
              <input className="chat-input" value={f.injector} onChange={set('injector')} placeholder="สัตวแพทย์ / ผู้ดูแลฟาร์ม" /></label>
            <div className="pig-form-field"><span>ผลการตรวจภูมิคุ้มกัน</span><Chips options={ANTIBODY} value={f.antibody_result} onChange={setV('antibody_result')} allowClear={false} /></div>
          </div>
          <label className="pig-form-field"><span>หมายเหตุ</span>
            <input className="chat-input" value={f.note} onChange={set('note')} placeholder="เช่น สุกรบางตัวมีไข้ งดฉีด 3 ตัว ควรฉีดชดเชยวันที่ …" /></label>
          <div className="vx-timeline">
            <div className="vx-tl-step on"><i className="ti ti-circle-check" /> ฉีดวัคซีน<small>{fmtDate(f.log_date)}</small></div>
            <div className="vx-tl-step"><i className="ti ti-stethoscope" /> ตรวจอาการ<small>วันที่ 1 · 3 · 7</small></div>
            <div className="vx-tl-step"><i className="ti ti-calendar-event" /> นัดฉีดซ้ำ<small>{f.next_due_date ? fmtDate(f.next_due_date) : 'ตามรอบ'}</small></div>
            <div className="vx-tl-step"><i className="ti ti-chart-line" /> ประเมินผล<small>หลังฉีดซ้ำ</small></div>
          </div>
          <div className="pig-form-actions">
            <button className="ask-btn" type="submit" disabled={saving}>
              <i className="ti ti-check" aria-hidden="true" /> {saving ? 'กำลังบันทึก…' : 'บันทึกการฉีด'}
            </button>
            <button className="btn-clear" type="button" onClick={() => setF({ ...EMPTY, log_date: f.log_date })} disabled={saving}>ล้างค่า</button>
            {msg && <span className="pig-form-msg">{msg}</span>}
          </div>
        </div>
      </div>
    </form>
  )
}

// ---------- ประวัติ + ตัวกรอง ----------
function HistoryPanel({ tick, onLineSent }) {
  const [filters, setFilters] = useState({ date_from: daysAgo(30), date_to: todayStr(), barn: '', vaccine: '', status: '' })
  const [applied, setApplied] = useState(filters)
  const [page, setPage] = useState(0)
  const [lineBusy, setLineBusy] = useState(false)
  const [lineMsg, setLineMsg] = useState('')
  const PAGE_SIZE = 50
  const { data, error } = usePolling(() => getVaccineHistory({ page, pageSize: PAGE_SIZE, filters: applied }), 60000, `${page}-${tick}-${JSON.stringify(applied)}`)
  const rows = data?.rows || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const set = (k) => (e) => setFilters((x) => ({ ...x, [k]: e.target.value }))

  const sendToLine = async () => {
    setLineBusy(true); setLineMsg('')
    try { const d = await sendVaccineReportToLine(); setLineMsg(d?.ok ? 'ส่งเข้า LINE แล้ว' : (d?.message || 'ส่งไม่สำเร็จ')) }
    catch { setLineMsg('ส่งไม่สำเร็จ') }
    finally { setLineBusy(false); setTimeout(() => setLineMsg(''), 6000); onLineSent?.() }
  }

  return (
    <div className="panel vx-sec" id="vx-history">
      <div className="vx-sec-head">
        <i className="ti ti-history" aria-hidden="true" />
        <span className="vx-sec-title">ประวัติการฉีด <small>{total} รายการ</small></span>
        <div className="head-controls">
          <a className="btn-export" href={apiUrl('/export/vaccine-log.pdf')} download><i className="ti ti-file-type-pdf" aria-hidden="true" /> ส่งออกรายงาน</a>
          <button className="btn-line" onClick={sendToLine} disabled={lineBusy}><i className="ti ti-brand-line" aria-hidden="true" /> {lineBusy ? 'กำลังส่ง…' : 'ส่งเข้า LINE'}</button>
          {lineMsg && <span className="pig-form-msg">{lineMsg}</span>}
        </div>
      </div>

      {/* ตัวกรอง */}
      <form className="vx-filters" onSubmit={(e) => { e.preventDefault(); setPage(0); setApplied(filters) }}>
        <label><span>ช่วงวันที่</span><span className="vx-range"><input type="date" className="chat-input" value={filters.date_from} onChange={set('date_from')} /> – <input type="date" className="chat-input" value={filters.date_to} onChange={set('date_to')} /></span></label>
        <label><span>โรงเรือน</span><select className="chat-input" value={filters.barn} onChange={set('barn')}><option value="">ทั้งหมด</option>{BARNS.map((b) => <option key={b}>{b}</option>)}</select></label>
        <label><span>ชนิดวัคซีน</span><input className="chat-input" value={filters.vaccine} onChange={set('vaccine')} placeholder="ทั้งหมด" /></label>
        <label><span>สถานะสุกร</span><select className="chat-input" value={filters.status} onChange={set('status')}><option value="">ทั้งหมด</option>{PIG_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        <button className="ask-btn" type="submit"><i className="ti ti-search" aria-hidden="true" /> ค้นหา</button>
        <button className="btn-clear" type="button" onClick={() => { const f0 = { date_from: '', date_to: '', barn: '', vaccine: '', status: '' }; setFilters(f0); setApplied(f0); setPage(0) }}><i className="ti ti-refresh" aria-hidden="true" /> ล้างค่า</button>
      </form>

      <div className="table-wrap">
        <table className="data-table vx-table">
          <thead><tr>
            <th>วันที่ฉีด</th><th>วัคซีน · ล็อต</th><th>วิธี · โดส</th><th>หมายเลข / โรงเรือน</th><th>จำนวน (ผู้/เมีย)</th><th>อายุ / ระยะ</th><th>สถานะ</th><th>อาการหลังฉีด</th><th>ผู้ฉีด · ภูมิ</th><th>นัดซ้ำ</th><th>หมายเหตุ</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="11" className="td-empty">{error ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้' : 'ไม่มีรายการในช่วงที่เลือก'}</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.log_date)}{r.log_time && <div className="vx-dim">{r.log_time}</div>}</td>
                <td><b>{r.vaccine_name || '—'}</b>{r.lot_no && <div className="vx-dim vx-mono">{r.lot_no}</div>}</td>
                <td>{r.route ? label(ROUTES, r.route) : '—'}{r.dose && <div className="vx-dim">{r.dose}</div>}</td>
                <td>{r.pig_ids ? <span className="vx-mono">{r.pig_ids}</span> : <span className="vx-dim">ทั้งคอก</span>}<div className="vx-dim">{[r.barn_no, r.pen_no].filter(Boolean).join(' · ') || '—'}</div></td>
                <td>{r.pig_count ?? '—'}{(r.male_count != null || r.female_count != null) && <div className="vx-dim">♂ {r.male_count ?? 0} / ♀ {r.female_count ?? 0}</div>}</td>
                <td>{r.age_stage || '—'}</td>
                <td>{r.pig_status ? <span className={`vx-pill ${statusTone(r.pig_status)}`}>{label(PIG_STATUS, r.pig_status)}</span> : '—'}</td>
                <td>{r.reaction ? <span className={`vx-pill ${r.reaction === 'normal' ? 'ok' : 'watch'}`}>{label(REACTIONS, r.reaction)}</span> : '—'}{r.reaction_note && <div className="vx-dim vx-note">{r.reaction_note}</div>}</td>
                <td>{r.injector || '—'}{r.antibody_result && r.antibody_result !== 'none' && <div className="vx-dim">{label(ANTIBODY, r.antibody_result)}</div>}</td>
                <td>{fmtDate(r.next_due_date)}</td>
                <td className="vx-note">{r.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel-foot pager-foot">
        <span>หน้า {page + 1}/{totalPages}</span>
        <div className="pager">
          <button className="pager-btn" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>‹ ก่อนหน้า</button>
          <button className="pager-btn" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>ถัดไป ›</button>
        </div>
      </div>
    </div>
  )
}

// ---------- เมนูหมวดด้านบน (sticky) — กดแล้วเลื่อนไปหัวข้อนั้น ไฮไลต์หมวดที่กำลังดูอยู่ ----------
const SECTIONS = [
  { id: 'vx-s1', n: 1, label: 'ข้อมูลวัคซีน' },
  { id: 'vx-s2', n: 2, label: 'ข้อมูลการให้วัคซีน' },
  { id: 'vx-s3', n: 3, label: 'ข้อมูลสุกรที่ได้รับวัคซีน' },
  { id: 'vx-s4', n: 4, label: 'ข้อมูลผู้ฉีดและการติดตาม' },
  { id: 'vx-history', n: null, label: 'ประวัติ', icon: 'ti-history' },
  { id: 'vx-followup', n: null, label: 'ติดตามอาการ', icon: 'ti-stethoscope' },
]

function SectionNav() {
  const [active, setActive] = useState('vx-s1')
  useEffect(() => {
    // หมวดไหนอยู่ใกล้ขอบบนสุด (ใต้เมนู) ถือว่ากำลังดูหมวดนั้น
    const els = SECTIONS.map((x) => document.getElementById(x.id)).filter(Boolean)
    if (!els.length) return
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (vis[0]) setActive(vis[0].target.id)
    }, { rootMargin: '-140px 0px -60% 0px', threshold: 0 })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  const go = (id) => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActive(id)
  }
  return (
    <nav className="vx-nav" aria-label="หมวดในหน้านี้">
      {SECTIONS.map((x) => (
        <button type="button" key={x.id} className={`vx-nav-btn ${active === x.id ? 'on' : ''}`} onClick={() => go(x.id)}>
          {x.n ? <span className="vx-nav-num">{x.n}</span> : <i className={`ti ${x.icon}`} aria-hidden="true" />}
          {x.label}
        </button>
      ))}
    </nav>
  )
}

// ---------- เหตุผลที่ต้องบันทึกละเอียด ----------
const WHY = [
  { icon: 'ti-calendar-stats', tone: 'green', t: 'วางแผนตารางฉีดวัคซีน', d: 'ให้ตรงรอบการผลิต ไม่พลาดกำหนดการ' },
  { icon: 'ti-search', tone: 'blue', t: 'ตรวจสอบย้อนหลังเมื่อเกิดการระบาด', d: 'รู้ว่าฉีดล็อตไหน เมื่อไร กับสุกรกลุ่มใด' },
  { icon: 'ti-file-certificate', tone: 'purple', t: 'ใช้ประกอบการขอรับรองฟาร์ม / การส่งออก', d: 'GAP · มาตรฐานโรงฆ่าสัตว์ ต้องมีบันทึกครบ' },
  { icon: 'ti-chart-bar', tone: 'amber', t: 'ติดตามประสิทธิภาพวัคซีนแต่ละยี่ห้อ', d: 'เทียบผลตรวจภูมิและอาการหลังฉีด เลือกยี่ห้อที่เหมาะกับฟาร์ม' },
]

export default function VaccinePage() {
  const [params] = useSearchParams()
  const [tick, setTick] = useState(0)
  const [products, setProducts] = useState([])
  const { data: stats } = usePolling(getVaccineStats, 60000, String(tick))
  const isAdmin = true // หน้านี้อยู่หลังล็อกอินอยู่แล้ว (คนใน) — ทะเบียนให้คนในเพิ่มได้ทุกคน

  const loadProducts = () => getVaccineProducts().then((d) => setProducts(d?.rows || [])).catch(() => setProducts([]))
  useEffect(() => { loadProducts() }, [tick])
  const refresh = () => setTick((t) => t + 1)

  return (
    <div className="vx">
      <header className="vx-head">
        <span className="vx-head-icon"><i className="ti ti-shield-check" aria-hidden="true" /></span>
        <div>
          <h1 className="vx-title">บันทึกข้อมูลวัคซีนในฟาร์มสุกร</h1>
          <p className="vx-sub">จัดการข้อมูลวัคซีนอย่างเป็นระบบ เพื่อสุขภาพสุกรที่ดี และฟาร์มที่ยั่งยืน</p>
        </div>
        <div className="vx-head-links">
          <Link to="/vaccine-info" className="btn-clear"><i className="ti ti-info-circle" aria-hidden="true" /> ข้อมูลวัคซีน</Link>
          <Link to="/vaccine-guide" className="btn-clear"><i className="ti ti-player-play" aria-hidden="true" /> วิธีฉีด</Link>
        </div>
      </header>

      <StatTiles stats={stats} />

      <SectionNav />

      <AdminGate>
        <ProductsPanel products={products} onChanged={refresh} isAdmin={isAdmin} />
        <RecordForm products={products} onSaved={refresh} presetVaccine={params.get('vaccine')} />
      </AdminGate>

      <HistoryPanel tick={tick} />

      <div id="vx-followup"><VaccineFollowup /></div>
      <VaccineDuePanel />

      <div className="panel vx-why">
        <div className="vx-sec-head"><i className="ti ti-bulb" aria-hidden="true" /><span className="vx-sec-title">เหตุผลที่ต้องบันทึกละเอียด</span></div>
        <div className="vx-why-grid">
          {WHY.map((w) => (
            <div className="vx-why-item" key={w.t}>
              <span className={`vx-why-icon ${w.tone}`}><i className={`ti ${w.icon}`} aria-hidden="true" /></span>
              <div><b>{w.t}</b><div className="vx-dim">{w.d}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { deleteRoutine, getAdminUsers, getRoutines, saveRoutine, updateRoutine } from '../api.js'

// ตั้งงานประจำที่ต้องทำซ้ำ — ระบบสร้างเป็นงานของวันนั้นให้เองทุกเช้า
// แล้วส่งเข้า LINE พร้อมชื่อคนที่รับผิดชอบ
//
// เก็บเป็น "แม่แบบ" แยกจากตารางงานจริง เพราะงานอย่าง "ให้อาหารเช้า" ต้องโผล่ใหม่ทุกวัน
// ถ้าเก็บเป็นงานธรรมดา ติ๊กเสร็จวันนี้แล้วพรุ่งนี้จะไม่มีงานนั้นอีก

const DAYS = [
  { n: 1, s: 'จ' }, { n: 2, s: 'อ' }, { n: 3, s: 'พ' }, { n: 4, s: 'พฤ' },
  { n: 5, s: 'ศ' }, { n: 6, s: 'ส' }, { n: 0, s: 'อา' },
]

const EMPTY = {
  title: '', detail: '', barn_no: '', pen_no: '',
  weekdays: [], due_time: '', priority: 'normal', assignee: '', active: true, sort_order: 0,
}

const daysText = (w) => (!w?.length
  ? 'ทุกวัน'
  : DAYS.filter((d) => w.includes(d.n)).map((d) => d.s).join(' '))

export default function RoutineManager() {
  const [rows, setRows] = useState(null)
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(null)      // null = ไม่ได้เปิดฟอร์ม
  const [editId, setEditId] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = () => getRoutines()
    .then((d) => setRows(d.rows || []))
    .catch(() => setRows([]))

  useEffect(() => {
    reload()
    getAdminUsers().then((d) => setUsers(d.rows || d.users || [])).catch(() => setUsers([]))
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const toggleDay = (n) => setForm((f) => ({
    ...f,
    weekdays: f.weekdays.includes(n) ? f.weekdays.filter((x) => x !== n) : [...f.weekdays, n],
  }))

  const startAdd = () => { setForm({ ...EMPTY }); setEditId(null); setErr('') }
  const startEdit = (r) => {
    setForm({
      title: r.title || '', detail: r.detail || '', barn_no: r.barn_no || '', pen_no: r.pen_no || '',
      weekdays: r.weekdays || [], due_time: r.due_time || '', priority: r.priority || 'normal',
      assignee: r.assignee || '', active: r.active !== false, sort_order: r.sort_order || 0,
    })
    setEditId(r.id); setErr('')
  }

  const save = async () => {
    if (!form.title.trim()) { setErr('ใส่ชื่องานก่อน'); return }
    setBusy(true)
    try {
      const body = { ...form, title: form.title.trim(), sort_order: Number(form.sort_order) || 0 }
      if (editId) await updateRoutine(editId, body)
      else await saveRoutine(body)
      await reload()
      setForm(null); setEditId(null)
    } catch (e) {
      setErr(e?.detail || 'บันทึกไม่สำเร็จ — สร้างตารางแล้วหรือยัง (backend/daily_tables.sql)')
    } finally { setBusy(false) }
  }

  const remove = async (r) => {
    if (!window.confirm(`ลบงานประจำ "${r.title}"?`)) return
    try { await deleteRoutine(r.id); await reload() } catch { setErr('ลบไม่สำเร็จ') }
  }

  // ปิด/เปิดงานชั่วคราว ไม่ต้องลบทิ้ง — ช่วงที่โรงเรือนว่างก็ปิดไว้ก่อนได้
  const toggleActive = async (r) => {
    try {
      await updateRoutine(r.id, {
        title: r.title, detail: r.detail, barn_no: r.barn_no, pen_no: r.pen_no,
        weekdays: r.weekdays || [], due_time: r.due_time, priority: r.priority || 'normal',
        assignee: r.assignee, active: !(r.active !== false), sort_order: r.sort_order || 0,
      })
      await reload()
    } catch { setErr('เปลี่ยนสถานะไม่สำเร็จ') }
  }

  if (rows == null) return <div className="empty-note">กำลังโหลดงานประจำ…</div>

  return (
    <div className="rt">
      <div className="rt-top">
        <div>
          <b>งานประจำ {rows.length ? `${rows.length} รายการ` : ''}</b>
          <small>ระบบสร้างเป็นงานของวันนั้นให้เองทุกเช้า แล้วส่งเข้า LINE พร้อมชื่อคนรับผิดชอบ</small>
        </div>
        <button type="button" className="ask-btn" onClick={() => (form ? setForm(null) : startAdd())}>
          <i className={`ti ${form ? 'ti-x' : 'ti-plus'}`} aria-hidden="true" /> {form ? 'ปิด' : 'เพิ่มงานประจำ'}
        </button>
      </div>

      {form && (
        <div className="rt-form">
          <div className="rt-grid">
            <label className="rt-f wide"><span>ชื่องาน *</span>
              <input className="chat-input" value={form.title} onChange={set('title')} placeholder="เช่น ให้อาหารมื้อเช้า" /></label>
            <label className="rt-f wide"><span>รายละเอียด</span>
              <input className="chat-input" value={form.detail} onChange={set('detail')} placeholder="สิ่งที่ต้องดู/ต้องจด" /></label>
            <label className="rt-f"><span>เวลา</span>
              <input className="chat-input" type="time" value={form.due_time} onChange={set('due_time')} /></label>
            <label className="rt-f"><span>โรงเรือน</span>
              <input className="chat-input" value={form.barn_no} onChange={set('barn_no')} placeholder="เช่น 2" /></label>
            <label className="rt-f"><span>คอก</span>
              <input className="chat-input" value={form.pen_no} onChange={set('pen_no')} placeholder="เช่น 5" /></label>
            <label className="rt-f"><span>ความสำคัญ</span>
              <select className="chat-input" value={form.priority} onChange={set('priority')}>
                <option value="normal">ปกติ</option>
                <option value="urgent">เร่งด่วน</option>
              </select></label>
            <label className="rt-f"><span>คนรับผิดชอบ</span>
              <select className="chat-input" value={form.assignee} onChange={set('assignee')}>
                <option value="">— ยังไม่ระบุ —</option>
                {users.map((u) => (
                  <option key={u.username} value={u.username}>{u.display_name || u.username}</option>
                ))}
              </select></label>
            <label className="rt-f"><span>ลำดับ</span>
              <input className="chat-input" type="number" value={form.sort_order} onChange={set('sort_order')} /></label>
          </div>

          <div className="rt-days">
            <span>ทำวันไหน</span>
            <div className="rt-day-btns">
              {DAYS.map((d) => (
                <button type="button" key={d.n}
                  className={`chip ${form.weekdays.includes(d.n) ? 'chip-on' : ''}`}
                  onClick={() => toggleDay(d.n)}>{d.s}</button>
              ))}
              <small>{form.weekdays.length ? '' : 'ไม่เลือกเลย = ทุกวัน'}</small>
            </div>
          </div>

          {err && <div className="rt-err"><i className="ti ti-alert-circle" aria-hidden="true" /> {err}</div>}

          <div className="rt-form-btns">
            <button type="button" className="ask-btn" onClick={save} disabled={busy}>
              <i className="ti ti-check" aria-hidden="true" /> {editId ? 'บันทึกการแก้ไข' : 'เพิ่มงานประจำ'}
            </button>
            <button type="button" className="ask-btn ghost" onClick={() => { setForm(null); setEditId(null) }}>ยกเลิก</button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="empty-note">ยังไม่มีงานประจำ — กด “เพิ่มงานประจำ” หรือรัน backend/daily_tables.sql เพื่อใส่ชุดเริ่มต้นให้</div>
      ) : (
        <ul className="rt-list">
          {rows.map((r) => (
            <li className={`rt-item ${r.active === false ? 'off' : ''}`} key={r.id}>
              <button type="button" className="rt-power" onClick={() => toggleActive(r)}
                aria-pressed={r.active !== false}
                title={r.active === false ? 'ปิดอยู่ กดเพื่อเปิด' : 'เปิดอยู่ กดเพื่อปิดชั่วคราว'}>
                <i className={`ti ${r.active === false ? 'ti-circle' : 'ti-circle-check-filled'}`} aria-hidden="true" />
              </button>
              <div className="rt-item-body">
                <b>{r.title}</b>
                <small>
                  {[r.due_time, daysText(r.weekdays),
                    r.assignee_name || r.assignee || 'ยังไม่มีคนรับ',
                    [r.barn_no, r.pen_no].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
                  {r.priority === 'urgent' && ' · เร่งด่วน'}
                  {r.due_today && r.active !== false && ' · วันนี้มี'}
                </small>
              </div>
              <button type="button" className="rt-ico" onClick={() => startEdit(r)} aria-label="แก้ไข">
                <i className="ti ti-pencil" aria-hidden="true" />
              </button>
              <button type="button" className="rt-ico danger" onClick={() => remove(r)} aria-label="ลบ">
                <i className="ti ti-trash" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { deleteFollowup, getFollowupDue, getFollowups, saveFollowup } from '../api.js'
import AdminGate from './AdminGate.jsx'
import usePolling from '../hooks/usePolling.js'

// ติดตามอาการหลังฉีดวัคซีน
// หลังฉีดต้องไปดูว่าหมูมีอาการข้างเคียงไหม (บวมตรงที่ฉีด ไข้ ซึม ไม่กินอาหาร)
// หน้านี้บอกว่าวันนี้ต้องไปตรวจอะไรบ้าง กดแล้วบันทึกผลได้เลย และดูผลย้อนหลังเทียบกันได้

const SWELLING = [
  { id: 'none', label: 'ไม่บวม' },
  { id: 'mild', label: 'บวมเล็กน้อย' },
  { id: 'moderate', label: 'บวมปานกลาง' },
  { id: 'severe', label: 'บวมมาก' },
]
const APPETITE = [
  { id: 'normal', label: 'กินปกติ' },
  { id: 'reduced', label: 'กินน้อยลง' },
  { id: 'none', label: 'ไม่กินเลย' },
]
const SEVERITY_CLASS = { 'ปกติ': 'ok', 'เฝ้าระวัง': 'watch', 'ต้องดูแล': 'bad' }

const EMPTY = { swelling: '', fever: false, lethargy: false, appetite: '', affected_count: '', note: '', checked_by: '' }

const where = (r) => [r.barn_no, r.pen_no].filter(Boolean).join(' · ') || 'ไม่ระบุจุด'

export default function VaccineFollowup() {
  const [tick, setTick] = useState(0)
  const [openFor, setOpenFor] = useState(null)   // รายการที่กำลังกรอกผลตรวจ
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(null)

  // รายการที่ถึงรอบตรวจ — ถามซ้ำทุกนาทีเหมือนตารางอื่นในหน้านี้
  const { data: due, error: dueErr } = usePolling(() => getFollowupDue(0), 60000, String(tick))

  useEffect(() => {
    let alive = true
    getFollowups().then((d) => alive && setDone(d)).catch(() => alive && setDone({ rows: [] }))
    return () => { alive = false }
  }, [tick])

  const openForm = (row) => {
    setOpenFor(row)
    setForm(EMPTY)
    setMsg('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!openFor) return
    setSaving(true)
    setMsg('')
    try {
      const r = await saveFollowup({
        vaccine_log_id: openFor.vaccine_log_id,
        check_date: openFor.due_date,
        swelling: form.swelling || null,
        fever: form.fever,
        lethargy: form.lethargy,
        appetite: form.appetite || null,
        affected_count: form.affected_count === '' ? null : Number(form.affected_count),
        note: form.note || null,
        checked_by: form.checked_by || null,
      })
      setOpenFor(null)
      setTick((t) => t + 1)
      setMsg(r.severity === 'ต้องดูแล'
        ? `บันทึกแล้ว — อาการระดับ "ต้องดูแล" แนะนำให้ติดต่อสัตวแพทย์`
        : 'บันทึกผลตรวจแล้ว')
      setTimeout(() => setMsg(''), 8000)
    } catch (err) {
      setMsg(err?.detail || 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row) => {
    if (!window.confirm('ลบผลตรวจรายการนี้?')) return
    try {
      await deleteFollowup(row.id)
      setTick((t) => t + 1)
    } catch {
      setMsg('ลบไม่สำเร็จ')
    }
  }

  const dueRows = due?.rows || []
  const doneRows = done?.rows || []
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">ติดตามอาการหลังฉีด · FOLLOW-UP</span>
          {dueRows.length > 0 && <span className="panel-tag est">ต้องตรวจ {dueRows.length}</span>}
        </div>
        <p className="fu-intro">
          หลังฉีดวัคซีนต้องดูว่ามีอาการข้างเคียงไหม — บวมตรงที่ฉีด มีไข้ ซึม หรือไม่กินอาหาร
          ระบบเตือนให้ตรวจวันที่ {(due?.followup_days || [1, 3, 7]).join(', ')} หลังฉีด
        </p>

        {dueErr && !due ? (
          <div className="empty-note">ดึงรายการไม่ได้ — ผู้ดูแลอาจยังไม่ได้สร้างตาราง vaccine_followup ที่ฐานข้อมูล</div>
        ) : dueRows.length === 0 ? (
          <div className="empty-note">{due ? 'ตรวจครบทุกรายการแล้ว' : 'กำลังโหลด…'}</div>
        ) : (
          <div className="fu-due">
            {dueRows.map((r) => (
              <div className={`fu-card ${r.overdue_days ? 'late' : ''}`} key={`${r.vaccine_log_id}-${r.days_after}`}>
                <div className="fu-card-top">
                  <span className="fu-day">วันที่ {r.days_after}</span>
                  {r.overdue_days > 0 && <span className="fu-late">เลย {r.overdue_days} วัน</span>}
                </div>
                <div className="fu-name">{r.vaccine_name || 'วัคซีน (ไม่ระบุชื่อ)'}</div>
                <div className="fu-meta">
                  <span><i className="ti ti-map-pin" aria-hidden="true" /> {where(r)}</span>
                  <span><i className="ti ti-calendar" aria-hidden="true" /> ฉีด {r.log_date}</span>
                  {r.pig_count ? <span><i className="ti ti-pig" aria-hidden="true" /> {r.pig_count} ตัว</span> : null}
                </div>
                <button className="ask-btn fu-btn" onClick={() => openForm(r)}>
                  <i className="ti ti-stethoscope" aria-hidden="true" /> บันทึกผลตรวจ
                </button>
              </div>
            ))}
          </div>
        )}
        {msg && <div className="fu-msg">{msg}</div>}

        {openFor && (
          <AdminGate>
            <form className="pig-form fu-form" onSubmit={submit}>
              <div className="fu-form-head">
                กำลังบันทึก: <b>{openFor.vaccine_name || 'วัคซีน'}</b> · {where(openFor)} · วันที่ {openFor.days_after} หลังฉีด
                <button type="button" className="fu-close" onClick={() => setOpenFor(null)} aria-label="ปิด">
                  <i className="ti ti-x" aria-hidden="true" />
                </button>
              </div>

              <div className="fu-field">
                <span>บริเวณที่ฉีด</span>
                <div className="chip-row">
                  {SWELLING.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      className={`chip ${form.swelling === s.id ? 'chip-on' : ''}`}
                      onClick={() => setForm((f) => ({ ...f, swelling: f.swelling === s.id ? '' : s.id }))}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fu-field">
                <span>การกินอาหาร</span>
                <div className="chip-row">
                  {APPETITE.map((a) => (
                    <button
                      type="button"
                      key={a.id}
                      className={`chip ${form.appetite === a.id ? 'chip-on' : ''}`}
                      onClick={() => setForm((f) => ({ ...f, appetite: f.appetite === a.id ? '' : a.id }))}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fu-checks">
                <label><input type="checkbox" checked={form.fever} onChange={set('fever')} /> มีไข้ / ตัวร้อน</label>
                <label><input type="checkbox" checked={form.lethargy} onChange={set('lethargy')} /> ซึม ไม่ค่อยเคลื่อนไหว</label>
              </div>

              <div className="pig-form-row">
                <label className="pig-form-field">
                  <span>จำนวนตัวที่มีอาการ</span>
                  <input type="number" min="0" className="chat-input" value={form.affected_count}
                    onChange={set('affected_count')} placeholder="เช่น 3" />
                </label>
                <label className="pig-form-field">
                  <span>ผู้ตรวจ</span>
                  <input type="text" className="chat-input" value={form.checked_by}
                    onChange={set('checked_by')} placeholder="ชื่อผู้ตรวจ" />
                </label>
              </div>

              <label className="pig-form-field">
                <span>บันทึกเพิ่มเติม</span>
                <input type="text" className="chat-input" value={form.note} onChange={set('note')}
                  placeholder="เช่น ก้อนบวมขนาดเท่าเหรียญบาท ไม่ร้อน" />
              </label>

              <div className="pig-form-actions">
                <button className="ask-btn" type="submit" disabled={saving}>
                  <i className="ti ti-device-floppy" aria-hidden="true" /> {saving ? 'กำลังบันทึก…' : 'บันทึกผลตรวจ'}
                </button>
                <button className="btn-clear" type="button" onClick={() => setOpenFor(null)} disabled={saving}>ยกเลิก</button>
              </div>
            </form>
          </AdminGate>
        )}

        <div className="fu-voice-tip">
          <i className="ti ti-microphone" aria-hidden="true" />
          พูดบันทึกได้: “บันทึกอาการหลังฉีด โรงเรือน 2 บวมเล็กน้อย 3 ตัว”
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><span className="panel-title">ผลตรวจที่บันทึกไว้</span></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>วันที่ตรวจ</th><th>วัคซีน</th><th>โรงเรือน</th><th>หลังฉีด</th>
                <th>อาการ</th><th>ระดับ</th><th>ผู้ตรวจ</th><th>หมายเหตุ</th><th />
              </tr>
            </thead>
            <tbody>
              {!done ? (
                <tr><td colSpan="9" className="td-empty">กำลังโหลด…</td></tr>
              ) : doneRows.length === 0 ? (
                <tr><td colSpan="9" className="td-empty">ยังไม่มีผลตรวจ</td></tr>
              ) : doneRows.map((r) => (
                <tr key={r.id}>
                  <td>{r.check_date}</td>
                  <td>{r.vaccine_name || '--'}</td>
                  <td>{r.barn_no || '--'}</td>
                  <td>{r.days_after != null ? `วันที่ ${r.days_after}` : '--'}</td>
                  <td>{r.summary}</td>
                  <td><span className={`fu-sev ${SEVERITY_CLASS[r.severity] || ''}`}>{r.severity || '--'}</span></td>
                  <td>{r.checked_by || '--'}</td>
                  <td>{r.note || '--'}</td>
                  <td>
                    <button className="pager-btn" onClick={() => remove(r)}>
                      <i className="ti ti-trash" aria-hidden="true" /> ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

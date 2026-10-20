import { useState } from 'react'
import { updateVaccineLog } from '../api.js'

// ตารางสิ่งที่เพิ่งบันทึกจากคำสั่งเสียง — โชว์ในหน้า Voice ทันทีหลังพูดจบ
//
// ทำไมต้องมี: คนพูดมักบอกไม่ครบ ("ฉีดวัคซีนอหิวาต์ 25 ตัว" ไม่ได้บอกโรงเรือน ไม่ได้บอกคนฉีด)
// ถ้าไม่โชว์ให้เห็น คนพูดจะไม่รู้เลยว่าระบบเก็บอะไรไว้บ้างและขาดอะไร
// กว่าจะรู้ก็ตอนเปิดดูรายงานทีหลัง ซึ่งนึกไม่ออกแล้วว่าวันนั้นฉีดกี่ตัว

const fmt = (v, type) => {
  if (v === null || v === undefined || v === '') return ''
  if (type === 'date') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? String(v)
      : d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  return String(v)
}

export default function VoiceSavedRecord({ saved }) {
  const [row, setRow] = useState(saved?.row || {})
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  if (!saved?.fields?.length) return null

  const start = () => {
    // เริ่มจากค่าปัจจุบัน ช่องว่างก็ว่างไว้ให้พิมพ์เติม
    const d = {}
    for (const f of saved.fields) d[f.key] = row[f.key] ?? ''
    setDraft(d)
    setErr('')
    setDone(false)
    setEditing(true)
  }

  const save = async () => {
    // ส่งเฉพาะช่องที่เปลี่ยนจริง ช่องที่ไม่ได้แตะไม่ต้องส่งไปทับ
    const patch = {}
    for (const f of saved.fields) {
      const next = (draft[f.key] ?? '').toString().trim()
      const now = (row[f.key] ?? '').toString()
      if (next !== now) patch[f.key] = next === '' ? null : next
    }
    if (!Object.keys(patch).length) { setEditing(false); return }

    setBusy(true)
    try {
      const updated = await updateVaccineLog(saved.id, patch)
      setRow(updated)
      setEditing(false)
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch (e) {
      setErr(e?.detail || 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setBusy(false)
    }
  }

  const empties = saved.fields.filter((f) => !row[f.key])

  return (
    <section className="vsr">
      <div className="vsr-top">
        <b><i className="ti ti-vaccine" aria-hidden="true" /> บันทึกการฉีดวัคซีนแล้ว</b>
        {!editing && (
          <button type="button" className="vsr-edit" onClick={start}>
            <i className="ti ti-pencil" aria-hidden="true" /> แก้ไข / เติมข้อมูล
          </button>
        )}
      </div>

      {!editing && empties.length > 0 && (
        <p className="vsr-missing">
          <i className="ti ti-info-circle" aria-hidden="true" />
          ยังไม่ได้บอก: {empties.map((f) => f.label).join(' · ')}
        </p>
      )}
      {done && <p className="vsr-ok"><i className="ti ti-check" aria-hidden="true" /> แก้ไขแล้ว</p>}
      {err && <p className="vsr-err"><i className="ti ti-alert-circle" aria-hidden="true" /> {err}</p>}

      <table className="vsr-table">
        <tbody>
          {saved.fields.map((f) => {
            const value = fmt(row[f.key], f.type)
            return (
              <tr key={f.key} className={value ? '' : 'empty'}>
                <th>{f.label}</th>
                <td>
                  {editing ? (
                    <input
                      className="chat-input vsr-input"
                      type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                      value={draft[f.key] ?? ''}
                      placeholder={f.label}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                    />
                  ) : (value || <span className="vsr-blank">— ยังไม่ได้ระบุ —</span>)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {editing && (
        <div className="vsr-btns">
          <button type="button" className="ask-btn" onClick={save} disabled={busy}>
            <i className="ti ti-check" aria-hidden="true" /> {busy ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}
          </button>
          <button type="button" className="ask-btn ghost" onClick={() => setEditing(false)}>ยกเลิก</button>
        </div>
      )}
    </section>
  )
}

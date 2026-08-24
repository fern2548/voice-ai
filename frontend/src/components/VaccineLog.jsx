import { useState } from 'react'
import usePolling from '../hooks/usePolling.js'
import { getVaccineHistory, saveVaccineLog, sendVaccineReportToLine } from '../api.js'
import AdminGate from './AdminGate.jsx'
import { apiUrl } from '../config.js'

const PAGE_SIZE = 100
const BARNS = ['โรงเรือน 1', 'โรงเรือน 2', 'โรงเรือน 3', 'โรงเรือน 4', 'โรงเรือน 5']
const PENS = Array.from({ length: 10 }, (_, i) => `คอก ${i + 1}`)

function todayStr() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

const EMPTY_FORM = {
  logDate: todayStr(),
  logTime: '',
  vaccineName: '',
  lotNo: '',
  barnNo: '',
  penNo: '',
  pigCount: '',
  dose: '',
  injector: '',
  nextDueDate: '',
  note: '',
}

export default function VaccineLog() {
  const [page, setPage] = useState(0)
  const [refreshTick, setRefreshTick] = useState(0)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [lineBusy, setLineBusy] = useState(false)
  const [lineMsg, setLineMsg] = useState('')

  const sendToLine = async () => {
    setLineBusy(true)
    setLineMsg('')
    try {
      const d = await sendVaccineReportToLine()
      setLineMsg(d?.ok ? 'ส่งเข้า LINE แล้ว' : (d?.message || 'ส่งไม่สำเร็จ'))
    } catch {
      setLineMsg('ส่งไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setLineBusy(false)
      setTimeout(() => setLineMsg(''), 6000)
    }
  }

  const { data, updatedAt, error } = usePolling(
    () => getVaccineHistory({ page, pageSize: PAGE_SIZE }),
    60000,
    `${page}-${refreshTick}`
  )
  const rows = Array.isArray(data?.rows) ? data.rows : []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const clearForm = () => setForm(EMPTY_FORM)

  const openVoiceAssistant = () => {
    // เปิดผู้ช่วยเสียงแบบลอย (มีอยู่แล้วทุกหน้า) ให้ผู้ใช้พูดบันทึกได้ทันทีจากปุ่มนี้
    document.querySelector('.chat-fab')?.click()
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.logDate) return
    setSaving(true)
    setSaveMsg('')
    try {
      await saveVaccineLog({
        log_date: form.logDate,
        log_time: form.logTime || null,
        vaccine_name: form.vaccineName.trim() || null,
        lot_no: form.lotNo.trim() || null,
        barn_no: form.barnNo || null,
        pen_no: form.penNo || null,
        pig_count: form.pigCount === '' ? null : Number(form.pigCount),
        dose: form.dose.trim() || null,
        injector: form.injector.trim() || null,
        next_due_date: form.nextDueDate || null,
        note: form.note.trim() || null,
      })
      setSaveMsg('บันทึกแล้วครับ')
      setForm({ ...EMPTY_FORM, logDate: form.logDate })
      setRefreshTick((t) => t + 1)
    } catch {
      setSaveMsg('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="panel vaccine-entry-panel">
        <div className="vaccine-entry-head">
          <div className="vaccine-entry-icon" aria-hidden="true">🐖</div>
          <div className="vaccine-entry-titles">
            <div className="vaccine-entry-h1">บันทึกการฉีดวัคซีน</div>
            <div className="vaccine-entry-sub">MANUAL ENTRY</div>
          </div>
          <div className="vaccine-entry-tip">
            <i className="ti ti-bulb" aria-hidden="true" />
            กรอกข้อมูลการฉีดวัคซีนให้ครบถ้วน ระบบจะช่วยแจ้งเตือนนัดครั้งถัดไปอัตโนมัติ
          </div>
        </div>

        <AdminGate>
        <form className="pig-form" onSubmit={submit}>
          <div className="pig-form-row">
            <label className="pig-form-field">
              <span>วันที่ฉีด</span>
              <input
                type="date"
                className="chat-input"
                value={form.logDate}
                max={todayStr()}
                onChange={setField('logDate')}
                required
              />
            </label>
            <label className="pig-form-field">
              <span>เวลาที่ฉีด</span>
              <input
                type="time"
                className="chat-input"
                value={form.logTime}
                onChange={setField('logTime')}
              />
            </label>
            <label className="pig-form-field">
              <span>ชื่อวัคซีน/ยา</span>
              <input
                type="text"
                className="chat-input"
                value={form.vaccineName}
                onChange={setField('vaccineName')}
                placeholder="เช่น ปากเท้าเปื่อย"
              />
            </label>
            <label className="pig-form-field">
              <span>Lot/Batch</span>
              <input
                type="text"
                className="chat-input"
                value={form.lotNo}
                onChange={setField('lotNo')}
                placeholder="เช่น LOT-2408A"
              />
            </label>
          </div>

          <div className="pig-form-row">
            <label className="pig-form-field">
              <span>เลขโรงเรือน</span>
              <select className="chat-input" value={form.barnNo} onChange={setField('barnNo')}>
                <option value="">เลือกโรงเรือน</option>
                {BARNS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>
            <label className="pig-form-field">
              <span>เลขคอก</span>
              <select className="chat-input" value={form.penNo} onChange={setField('penNo')}>
                <option value="">เลือกคอก</option>
                {PENS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="pig-form-field">
              <span>จำนวนหมูที่ฉีด (ตัว)</span>
              <input
                type="number"
                min="0"
                className="chat-input"
                value={form.pigCount}
                onChange={setField('pigCount')}
                placeholder="เช่น 20"
              />
            </label>
            <label className="pig-form-field">
              <span>ปริมาณ/ขนาดยา</span>
              <input
                type="text"
                className="chat-input"
                value={form.dose}
                onChange={setField('dose')}
                placeholder="เช่น 2 ml/ตัว"
              />
            </label>
          </div>

          <div className="pig-form-row">
            <label className="pig-form-field">
              <span>ผู้ฉีด</span>
              <input
                type="text"
                className="chat-input"
                value={form.injector}
                onChange={setField('injector')}
                placeholder="ชื่อผู้ฉีด"
              />
            </label>
            <label className="pig-form-field">
              <span>นัดฉีดครั้งถัดไป</span>
              <input
                type="date"
                className="chat-input"
                value={form.nextDueDate}
                onChange={setField('nextDueDate')}
                placeholder="ระบบคำนวณให้อัตโนมัติถ้ามีกำหนด"
              />
            </label>
          </div>

          <label className="pig-form-field pig-form-note">
            <span>บันทึกเพิ่มเติม (ถ้ามี)</span>
            <input
              type="text"
              className="chat-input"
              value={form.note}
              onChange={setField('note')}
              placeholder="เช่น อาการหลังฉีด"
            />
          </label>

          <div className="vaccine-entry-actions">
            <div className="vaccine-entry-actions-left">
              <button className="ask-btn" type="submit" disabled={saving}>
                <i className="ti ti-device-floppy" aria-hidden="true" style={{ marginRight: 6 }} />
                {saving ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}
              </button>
              <button className="btn-clear" type="button" onClick={clearForm} disabled={saving}>
                <i className="ti ti-refresh" aria-hidden="true" style={{ marginRight: 6 }} />
                ล้างข้อมูล
              </button>
              {saveMsg && <span className="pig-form-msg">{saveMsg}</span>}
            </div>
            <div className="vaccine-entry-note-card">
              <i className="ti ti-calendar-event" aria-hidden="true" />
              ระบบจะคำนวณนัดครั้งถัดไป พร้อมแจ้งเตือนให้คุณอัตโนมัติ
            </div>
          </div>
        </form>
        </AdminGate>

        <div className="vaccine-entry-voice-tip">
          <i className="ti ti-bulb" aria-hidden="true" />
          เคล็ดลับ: คุณสามารถใช้ Voice AI เพื่อบันทึกข้อมูลได้รวดเร็วยิ่งขึ้น
          <button type="button" className="btn-voice-shortcut" onClick={openVoiceAssistant}>
            <i className="ti ti-microphone" aria-hidden="true" style={{ marginRight: 6 }} />
            บันทึกด้วยเสียง
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">ประวัติการฉีดวัคซีน · HISTORY</span>
          <div className="head-controls">
            <a className="btn-export" href={apiUrl('/export/vaccine-log.pdf')} download>
              <i className="ti ti-file-type-pdf" aria-hidden="true" style={{ marginRight: 5 }} />
              ดาวน์โหลด PDF
            </a>
            <button className="btn-line" onClick={sendToLine} disabled={lineBusy}>
              <i className="ti ti-brand-line" aria-hidden="true" style={{ marginRight: 5 }} />
              {lineBusy ? 'กำลังส่ง…' : 'ส่งเข้า LINE'}
            </button>
            {lineMsg && <span className="pig-form-msg">{lineMsg}</span>}
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>วันที่ฉีด</th>
                <th>เวลา</th>
                <th>ชื่อวัคซีน/ยา</th>
                <th>Lot/Batch</th>
                <th>โรงเรือน</th>
                <th>คอก</th>
                <th>จำนวน (ตัว)</th>
                <th>ปริมาณ/ขนาดยา</th>
                <th>ผู้ฉีด</th>
                <th>นัดครั้งถัดไป</th>
                <th>บันทึกเพิ่มเติม</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="11" className="td-empty">
                    {error ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้' : 'ยังไม่มีข้อมูล'}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.log_date}</td>
                    <td>{row.log_time ?? '--'}</td>
                    <td>{row.vaccine_name ?? '--'}</td>
                    <td>{row.lot_no ?? '--'}</td>
                    <td>{row.barn_no ?? '--'}</td>
                    <td>{row.pen_no ?? '--'}</td>
                    <td>{row.pig_count ?? '--'}</td>
                    <td>{row.dose ?? '--'}</td>
                    <td>{row.injector ?? '--'}</td>
                    <td>{row.next_due_date ?? '--'}</td>
                    <td>{row.note ?? '--'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="panel-foot pager-foot">
          <span>
            {total > 0
              ? `ทั้งหมด ${total} รายการ · หน้า ${page + 1}/${totalPages}`
              : '—'}
            {updatedAt && ' · อัปเดต ' + updatedAt.toLocaleTimeString('th-TH')}
          </span>
          <div className="pager">
            <button
              className="pager-btn"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              ‹ ก่อนหน้า
            </button>
            <button
              className="pager-btn"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              ถัดไป ›
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

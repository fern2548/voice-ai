import { useState } from 'react'
import usePolling from '../hooks/usePolling.js'
import { getPigHealthLog, savePigHealth } from '../api.js'

const PAGE_SIZE = 100

function todayStr() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export default function PigHealthLog() {
  const [page, setPage] = useState(0)
  const [refreshTick, setRefreshTick] = useState(0)
  const [logDate, setLogDate] = useState(todayStr())
  const [sickCount, setSickCount] = useState('')
  const [totalCount, setTotalCount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const { data, updatedAt, error } = usePolling(
    () => getPigHealthLog({ page, pageSize: PAGE_SIZE }),
    60000,
    `${page}-${refreshTick}`
  )
  const rows = Array.isArray(data?.rows) ? data.rows : []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const submit = async (e) => {
    e.preventDefault()
    if (!logDate || sickCount === '') return
    setSaving(true)
    setSaveMsg('')
    try {
      await savePigHealth({
        log_date: logDate,
        sick_count: Number(sickCount),
        total_count: totalCount === '' ? null : Number(totalCount),
        note: note.trim() || null,
      })
      setSaveMsg('บันทึกแล้วครับ')
      setNote('')
      setRefreshTick((t) => t + 1)
    } catch {
      setSaveMsg('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">บันทึกจำนวนหมูป่วยรายวัน · MANUAL ENTRY</span>
        </div>
        <form className="pig-form" onSubmit={submit}>
          <div className="pig-form-row">
            <label className="pig-form-field">
              <span>วันที่</span>
              <input
                type="date"
                className="chat-input"
                value={logDate}
                max={todayStr()}
                onChange={(e) => setLogDate(e.target.value)}
                required
              />
            </label>
            <label className="pig-form-field">
              <span>จำนวนหมูป่วย (ตัว)</span>
              <input
                type="number"
                min="0"
                className="chat-input"
                value={sickCount}
                onChange={(e) => setSickCount(e.target.value)}
                placeholder="เช่น 3"
                required
              />
            </label>
            <label className="pig-form-field">
              <span>จำนวนหมูทั้งหมด (ตัว, ถ้ามี)</span>
              <input
                type="number"
                min="0"
                className="chat-input"
                value={totalCount}
                onChange={(e) => setTotalCount(e.target.value)}
                placeholder="ไม่บังคับ"
              />
            </label>
          </div>
          <label className="pig-form-field pig-form-note">
            <span>บันทึกเพิ่มเติม (ถ้ามี)</span>
            <input
              type="text"
              className="chat-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น อาการ, คอกที่พบ"
            />
          </label>
          <div className="pig-form-actions">
            <button className="ask-btn" type="submit" disabled={saving}>
              {saving ? 'กำลังบันทึก…' : 'บันทึก'}
            </button>
            {saveMsg && <span className="pig-form-msg">{saveMsg}</span>}
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">ประวัติหมูป่วยรายวัน · HISTORY</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>จำนวนป่วย (ตัว)</th>
                <th>จำนวนทั้งหมด (ตัว)</th>
                <th>บันทึกเพิ่มเติม</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="4" className="td-empty">
                    {error ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้' : 'ยังไม่มีข้อมูล'}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.log_date}</td>
                    <td>{row.sick_count}</td>
                    <td>{row.total_count ?? '--'}</td>
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

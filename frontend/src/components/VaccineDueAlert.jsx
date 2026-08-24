import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import usePolling from '../hooks/usePolling.js'
import { getVaccineDue } from '../api.js'

export default function VaccineDueAlert() {
  const { data } = usePolling(() => getVaccineDue(0), 60000) // 0 วัน = ถึงกำหนดวันนี้/เลยกำหนดแล้ว
  const rows = Array.isArray(data?.rows) ? data.rows : []
  const [dismissed, setDismissed] = useState(false)
  const navigate = useNavigate()

  // มีรายการใหม่ที่ยังไม่เคยแจ้ง (จำนวนเปลี่ยน) -> เปิดแจ้งเตือนใหม่อีกครั้งแม้เพิ่งปิดไป
  const key = rows.map((r) => r.id).sort().join(',')
  useEffect(() => {
    setDismissed(false)
  }, [key])

  if (rows.length === 0 || dismissed) return null

  return (
    <div
      className="sensor-alert vaccine-due-alert vaccine-due-alert-clickable"
      role="alert"
      tabIndex={0}
      onClick={() => navigate('/vaccine')}
      onKeyDown={(e) => e.key === 'Enter' && navigate('/vaccine')}
    >
      <i className="ti ti-vaccine" aria-hidden="true" />
      <div className="sensor-alert-text">
        <div className="sensor-alert-title">ถึงกำหนดฉีดวัคซีนแล้ว ({rows.length} รายการ)</div>
        <div className="sensor-alert-sub">
          {rows.slice(0, 3).map((r) => {
            const where = [r.barn_no, r.pen_no].filter(Boolean).join(' ')
            return `${r.vaccine_name || 'วัคซีน'}${where ? ' · ' + where : ''}`
          }).join(' · ')}
          {rows.length > 3 ? ` และอีก ${rows.length - 3} รายการ` : ''}
        </div>
        <div className="vaccine-due-alert-link">
          <i className="ti ti-arrow-right" aria-hidden="true" /> ดูรายละเอียด
        </div>
      </div>
      <button
        className="sensor-alert-close"
        onClick={(e) => { e.stopPropagation(); setDismissed(true) }}
        aria-label="ปิดการแจ้งเตือน"
      >
        <i className="ti ti-x" aria-hidden="true" />
      </button>
    </div>
  )
}

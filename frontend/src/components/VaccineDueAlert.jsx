import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import usePolling from '../hooks/usePolling.js'
import { getVaccineDue } from '../api.js'

// เหลืออีกกี่วันถึงกำหนด — เทียบแบบวันต่อวัน ไม่เอาเวลามาปน
function daysLeft(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  due.setHours(0, 0, 0, 0)
  return Math.round((due - today) / 86400000)
}

function whenLabel(dateStr) {
  const d = daysLeft(dateStr)
  if (Number.isNaN(d)) return ''
  if (d < 0) return `เลยกำหนด ${-d} วัน`
  if (d === 0) return 'วันนี้'
  if (d === 1) return 'พรุ่งนี้'
  return `อีก ${d} วัน`
}

const MAX_SHOWN = 4

export default function VaccineDueAlert() {
  // 3 วัน = ช่วงเดียวกับที่แจ้งเตือนเข้า LINE ทุกเช้า ทั้งสองทางจะได้เตือนเรื่องเดียวกัน
  // (เดิมตั้งไว้ 0 วัน คือเตือนเฉพาะวันที่ถึงกำหนดพอดี แคบเกินจนแทบไม่เคยขึ้นให้เห็น)
  const { data } = usePolling(() => getVaccineDue(3), 60000)
  const rows = Array.isArray(data?.rows) ? data.rows : []
  const [dismissed, setDismissed] = useState(false)
  const navigate = useNavigate()

  // มีรายการใหม่ที่ยังไม่เคยแจ้ง (จำนวนเปลี่ยน) -> เปิดแจ้งเตือนใหม่อีกครั้งแม้เพิ่งปิดไป
  const key = rows.map((r) => r.id).sort().join(',')
  useEffect(() => {
    setDismissed(false)
  }, [key])

  if (rows.length === 0 || dismissed) return null

  // ถ้ามีรายการที่ถึงกำหนด/เลยกำหนดแล้ว ให้พาดหัวแบบเร่งด่วน ไม่งั้นบอกว่าใกล้ครบกำหนด
  const overdue = rows.filter((r) => daysLeft(r.next_due_date) <= 0).length
  const title = overdue
    ? `ถึงกำหนดฉีดวัคซีนแล้ว (${overdue} รายการ)`
    : `ใกล้ครบกำหนดฉีดวัคซีน (${rows.length} รายการ)`

  // พาไปที่หน้าวัคซีนพร้อมชี้ว่ารายการไหน หน้านั้นจะเลื่อนไปหาและไฮไลต์ให้
  const openRow = (id) => navigate(`/vaccine?focus=${id}`)

  return (
    <div className="sensor-alert vaccine-due-alert" role="alert">
      <i className="ti ti-vaccine" aria-hidden="true" />

      <div className="sensor-alert-text">
        <div className="sensor-alert-title">{title}</div>

        {/* แยกทีละรายการ กดอันไหนก็เข้าไปดูรายละเอียดอันนั้น
            (เดิมเอาทุกรายการมาต่อกันเป็นบรรทัดเดียว อ่านยากและกดแยกไม่ได้) */}
        <ul className="vd-list">
          {rows.slice(0, MAX_SHOWN).map((r) => {
            const where = [r.barn_no, r.pen_no].filter(Boolean).join(' · ')
            const left = daysLeft(r.next_due_date)
            return (
              <li key={r.id}>
                <button
                  type="button"
                  className={`vd-item ${left <= 0 ? 'overdue' : ''}`}
                  onClick={() => openRow(r.id)}
                >
                  <span className="vd-item-main">
                    <span className="vd-name">{r.vaccine_name || 'วัคซีน'}</span>
                    {where && <span className="vd-where">{where}</span>}
                  </span>
                  <span className="vd-when">{whenLabel(r.next_due_date)}</span>
                  <i className="ti ti-chevron-right vd-go" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>

        {rows.length > MAX_SHOWN && (
          <button type="button" className="vd-more" onClick={() => navigate('/vaccine')}>
            ดูอีก {rows.length - MAX_SHOWN} รายการ
          </button>
        )}
      </div>

      <button
        className="sensor-alert-close"
        onClick={() => setDismissed(true)}
        aria-label="ปิดการแจ้งเตือน"
      >
        <i className="ti ti-x" aria-hidden="true" />
      </button>
    </div>
  )
}

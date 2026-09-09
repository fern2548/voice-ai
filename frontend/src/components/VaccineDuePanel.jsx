import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import usePolling from '../hooks/usePolling.js'
import { getVaccineDue } from '../api.js'

function daysLeft(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  due.setHours(0, 0, 0, 0)
  return Math.round((due - today) / 86400000)
}

function whenLabel(dateStr) {
  const d = daysLeft(dateStr)
  if (Number.isNaN(d)) return '—'
  if (d < 0) return `เลยกำหนด ${-d} วัน`
  if (d === 0) return 'ถึงกำหนดวันนี้'
  if (d === 1) return 'พรุ่งนี้'
  return `อีก ${d} วัน`
}

const FIELDS = [
  ['ฉีดครั้งล่าสุด', (r) => r.log_date],
  ['โรงเรือน', (r) => r.barn_no],
  ['คอก', (r) => r.pen_no],
  ['จำนวนที่ฉีด', (r) => (r.pig_count != null ? `${r.pig_count} ตัว` : null)],
  ['ปริมาณ/ขนาดยา', (r) => r.dose],
  ['Lot/Batch', (r) => r.lot_no],
  ['ผู้ฉีด', (r) => r.injector],
  ['บันทึกเพิ่มเติม', (r) => r.note],
]

// รายการวัคซีนที่ใกล้ครบกำหนด แสดงแยกเป็นการ์ดละรายการ พร้อมรายละเอียดครบ
// กดจากแถบแจ้งเตือนจะพามาที่นี่พร้อม ?focus=<id> แล้วเลื่อนไปไฮไลต์ใบนั้นให้
export default function VaccineDuePanel() {
  const { data } = usePolling(() => getVaccineDue(7), 60000)
  const rows = Array.isArray(data?.rows) ? data.rows : []
  const [params, setParams] = useSearchParams()
  const focusId = params.get('focus')
  const focusRef = useRef(null)

  useEffect(() => {
    if (!focusId || !focusRef.current) return
    focusRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusId, rows.length])

  if (rows.length === 0) return null

  // รายการที่ถูกกดมาจากแถบแจ้งเตือน — ใช้ทำกล่องบอกด้านบนให้รู้ว่ากำลังดูอันไหนอยู่
  const focusRow = focusId ? rows.find((r) => String(r.id) === focusId) : null

  return (
    <div className="panel vd-panel">
      <div className="panel-head">
        <span className="panel-title">ใกล้ครบกำหนดฉีด · DUE SOON</span>
        <span className="vd-panel-count">{rows.length} รายการ</span>
      </div>

      {/* มาจากการกดแจ้งเตือน — บอกให้ชัดว่ากำลังดูรายการไหน
          ไม่งั้นพอมีหลายใบผู้ใช้จะไม่รู้ว่าที่กดมาคืออันไหน */}
      {focusId && (
        <div className="vd-focus-note" role="status">
          <i className="ti ti-arrow-down-circle" aria-hidden="true" />
          <div>
            {focusRow ? (
              <>
                <b>นี่คือรายการที่คุณกดมาจากการแจ้งเตือน</b>
                <span>
                  {focusRow.vaccine_name || 'วัคซีน'}
                  {[focusRow.barn_no, focusRow.pen_no].filter(Boolean).length
                    ? ' · ' + [focusRow.barn_no, focusRow.pen_no].filter(Boolean).join(' · ')
                    : ''}
                  {' — นัดฉีด '}
                  {focusRow.next_due_date || '—'}
                </span>
              </>
            ) : (
              <>
                <b>ไม่พบรายการที่กดมา</b>
                <span>อาจถูกบันทึกฉีดไปแล้ว หรือเลยช่วงแจ้งเตือน 7 วัน</span>
              </>
            )}
          </div>
          <button type="button" className="vd-clear" onClick={() => setParams({})}>
            ปิด
          </button>
        </div>
      )}

      <div className={`vd-cards ${focusRow ? 'has-focus' : ''}`}>
        {rows.map((r) => {
          const focused = String(r.id) === focusId
          const left = daysLeft(r.next_due_date)
          return (
            <article
              key={r.id}
              ref={focused ? focusRef : null}
              className={`vd-card ${left <= 0 ? 'overdue' : ''} ${focused ? 'focused' : ''}`}
            >
              {focused && (
                <span className="vd-focus-tag">
                  <i className="ti ti-point-filled" aria-hidden="true" />
                  รายการที่คุณเลือก
                </span>
              )}

              <header className="vd-card-head">
                <h3 className="vd-card-name">{r.vaccine_name || 'วัคซีน'}</h3>
                <span className={`vd-badge ${left <= 0 ? 'overdue' : ''}`}>
                  {whenLabel(r.next_due_date)}
                </span>
              </header>

              <p className="vd-card-due">
                <i className="ti ti-calendar-event" aria-hidden="true" />
                นัดฉีดครั้งถัดไป <b>{r.next_due_date || '—'}</b>
              </p>

              <dl className="vd-card-grid">
                {FIELDS.map(([label, pick]) => {
                  const value = pick(r)
                  if (value == null || value === '') return null
                  return (
                    <div className="vd-field" key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  )
                })}
              </dl>
            </article>
          )
        })}
      </div>

    </div>
  )
}

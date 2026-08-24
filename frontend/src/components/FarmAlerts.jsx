import { useEffect, useState } from 'react'
import { getVaccineDue, getPigHealthLog } from '../api.js'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function daysUntil(dateStr) {
  const diff = (new Date(dateStr) - new Date(todayStr())) / (1000 * 60 * 60 * 24)
  return Math.round(diff)
}

// ตัวอย่างการแจ้งเตือน — ยังไม่มีระบบติดตามอาหาร/น้ำจริงในระบบ (รอต่อ backend ทีหลัง)
const DEMO_ALERTS = [
  { icon: 'ti-meat', level: 'warn', text: 'อาหารใกล้หมด', tag: 'ในอีก 2 วัน', demo: true },
  { icon: 'ti-droplet', level: 'warn', text: 'ถังน้ำเหลือน้อย', tag: 'ควรเติมน้ำ', demo: true },
]

export default function FarmAlerts() {
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const real = []
      try {
        const due = await getVaccineDue(3)
        for (const row of due.rows || []) {
          const d = daysUntil(row.next_due_date)
          const where = [row.barn_no, row.pen_no].filter(Boolean).join(' ')
          real.push({
            icon: 'ti-vaccine',
            level: 'danger',
            text: `วัคซีน${row.vaccine_name || ''} ใกล้ครบกำหนด${where ? ' · ' + where : ''}`,
            tag: d <= 0 ? 'ถึงกำหนดแล้ว' : d === 1 ? 'พรุ่งนี้' : `อีก ${d} วัน`,
          })
        }
      } catch { /* ignore */ }

      try {
        const log = await getPigHealthLog({ page: 0, pageSize: 2 })
        const rows = log.rows || []
        if (rows.length >= 2 && rows[0].sick_count > rows[1].sick_count) {
          real.push({
            icon: 'ti-heartbeat',
            level: 'warn',
            text: 'หมูป่วยเพิ่มขึ้นผิดปกติ',
            tag: `+${rows[0].sick_count - rows[1].sick_count} ตัว`,
          })
        }
      } catch { /* ignore */ }

      if (!cancelled) setAlerts([...real, ...DEMO_ALERTS])
    }

    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="side-card">
      <div className="side-card-head">แจ้งเตือนสำคัญ</div>
      {alerts.length === 0 ? (
        <div className="farm-alerts-empty">ไม่มีการแจ้งเตือนตอนนี้</div>
      ) : (
        <div className="farm-alerts-list">
          {alerts.map((a, i) => (
            <div key={i} className={`farm-alert-item lv-${a.level}`}>
              <i className={`ti ${a.icon}`} aria-hidden="true" />
              <span className="farm-alert-text">{a.text}{a.demo && <span className="side-card-demo-tag inline">ตัวอย่าง</span>}</span>
              <span className="farm-alert-tag">{a.tag}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuth.jsx'
import usePolling from '../hooks/usePolling.js'
import { getTasks, getVaccineDue } from '../api.js'

// ตารางทางลัดของหน้า "รวมทุกเมนู" — เปิดหน้าเดียวเห็นทุกอย่างที่ระบบทำได้
// จัดเป็นกลุ่มตามงานที่ทำ ไม่ได้เรียงยาวเป็นแถวเดียว จะได้กวาดตาหาเจอเร็ว
// หน้าที่ต้องล็อกอิน (internal) จะไม่ขึ้นให้คนนอกเห็น เพราะกดไปก็เข้าไม่ได้

const GROUPS = [
  {
    title: 'ดูแลหมู',
    items: [
      { to: '/tasks', label: 'งานวันนี้', icon: 'ti-checkbox', internal: true, badge: 'tasks' },
      { to: '/pig-log', label: 'โรงเรือน', icon: 'ti-building-warehouse', internal: true },
      { to: '/vaccine', label: 'วัคซีน', icon: 'ti-vaccine', internal: true, badge: 'due' },
      { to: '/vaccine-plan', label: 'แผนวัคซีนตามอายุ', icon: 'ti-calendar-stats', internal: true },
      { to: '/diseases', label: 'อาการของโรค', icon: 'ti-mood-sick' },
      { to: '/vet', label: 'ปรึกษาสัตวแพทย์', icon: 'ti-message-circle', internal: true },
    ],
  },
  {
    title: 'จัดการฟาร์ม',
    items: [
      { to: '/feed', label: 'อาหารสัตว์', icon: 'ti-bowl' },
      { to: '/breeding', label: 'การผสมพันธุ์', icon: 'ti-heart-handshake' },
      { to: '/cleaning', label: 'ทำความสะอาดโรงเรือน', icon: 'ti-spray' },
      { to: '/checklist', label: 'เช็กลิสต์มาตรฐานฟาร์ม', icon: 'ti-checklist' },
    ],
  },
  {
    title: 'ข้อมูลและรายงาน',
    items: [
      { to: '/forecast', label: 'สภาพอากาศ', icon: 'ti-cloud' },
      { to: '/sensors', label: 'กราฟข้อมูล', icon: 'ti-chart-line' },
      { to: '/history', label: 'รายงาน', icon: 'ti-report' },
      { to: '/vaccine-info', label: 'ข้อมูลวัคซีน', icon: 'ti-file-info' },
      { to: '/vaccine-guide', label: 'วิธีฉีดวัคซีน', icon: 'ti-needle' },
    ],
  },
]

export default function MenuGrid() {
  const { isAdmin } = useAdminAuth()

  // ดึงเฉพาะตอนล็อกอินแล้ว คนนอกเรียกไม่ได้อยู่แล้ว ขอไปก็ได้ 401 เปล่า ๆ
  // ต้องคืน Promise เสมอ เพราะ usePolling เรียก .then() ทันทีโดยไม่เช็กก่อน
  const { data: taskData } = usePolling(
    () => (isAdmin ? getTasks() : Promise.resolve(null)), 60000, isAdmin)
  const { data: dueData } = usePolling(
    () => (isAdmin ? getVaccineDue(7) : Promise.resolve(null)), 60000, isAdmin)

  const openTasks = Array.isArray(taskData?.rows)
    ? taskData.rows.filter((t) => t.status === 'pending' || t.status === 'doing').length
    : 0
  const dueCount = Number(dueData?.total) || 0
  const counts = { tasks: openTasks, due: dueCount }

  const alerts = []
  if (openTasks) alerts.push({ to: '/tasks', icon: 'ti-checkbox', text: `งานค้าง ${openTasks} งาน` })
  if (dueCount) alerts.push({ to: '/vaccine-plan', icon: 'ti-vaccine', text: `วัคซีนถึงกำหนด ${dueCount} รายการ` })

  return (
    <section className="hs">
      {isAdmin && alerts.length > 0 && (
        <div className="hs-alerts">
          {alerts.map((a) => (
            <Link key={a.to} to={a.to} className="hs-alert">
              <i className={`ti ${a.icon}`} aria-hidden="true" />
              <span>{a.text}</span>
              <i className="ti ti-chevron-right hs-alert-go" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}

      {GROUPS.map((g) => {
        const items = g.items.filter((it) => isAdmin || !it.internal)
        if (!items.length) return null
        return (
          <div className="hs-group" key={g.title}>
            <h2 className="hs-group-title">{g.title}</h2>
            <div className="hs-grid">
              {items.map((it) => {
                const n = it.badge ? counts[it.badge] : 0
                return (
                  <Link to={it.to} className="hs-tile" key={it.to}>
                    <span className="hs-ico">
                      <i className={`ti ${it.icon}`} aria-hidden="true" />
                      {n > 0 && <span className="hs-badge">{n > 99 ? '99+' : n}</span>}
                    </span>
                    <span className="hs-label">{it.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}

      {!isAdmin && (
        <p className="hs-login">
          <i className="ti ti-lock" aria-hidden="true" />
          เข้าสู่ระบบเพื่อใช้ส่วนบันทึกข้อมูลฟาร์ม — งานวันนี้ · โรงเรือน · วัคซีน · ปรึกษาสัตวแพทย์
        </p>
      )}
    </section>
  )
}

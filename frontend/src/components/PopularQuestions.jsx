import { Link } from 'react-router-dom'

// เมนูสั่งงาน/ทางลัดไปหน้าต่าง ๆ
const LINKS = [
  { icon: 'ti-building-warehouse', tone: 'blue', label: 'ไปหน้าโรงเรือน', sub: 'ดูข้อมูลโรงเรือนและจำนวนสุกร', to: '/pig-log' },
  { icon: 'ti-heartbeat', tone: 'pink', label: 'ดูหมูป่วยวันนี้', sub: 'ตรวจสอบหมูป่วยและการรักษา', to: '/pig-log' },
  { icon: 'ti-vaccine', tone: 'cyan', label: 'บันทึกการฉีดวัคซีน', sub: 'บันทึกและดูประวัติฉีดวัคซีน', to: '/vaccine' },
  { icon: 'ti-file-analytics', tone: 'purple', label: 'เปิดรายงาน', sub: 'ดูรายงานและสถิติฟาร์ม', to: '/history' },
  { icon: 'ti-bell', tone: 'amber', label: 'การแจ้งเตือน', sub: 'ดูการแจ้งเตือนทั้งหมด', to: '/vaccine' },
]

export default function PopularQuestions() {
  return (
    <div className="quick-nav">
      <div className="quick-nav-title">
        <i className="ti ti-wave-sine" aria-hidden="true" />
        สั่งงานด้วยเสียง เพื่อไปยังหน้าต่างๆ
      </div>
      {LINKS.map((l) => (
        <Link key={l.label} to={l.to} className="quick-nav-card">
          <span className={`quick-nav-icon tone-${l.tone}`}>
            <i className={`ti ${l.icon}`} aria-hidden="true" />
          </span>
          <span className="quick-nav-body">
            <span className="quick-nav-label">{l.label}</span>
            <span className="quick-nav-sub">{l.sub}</span>
          </span>
          <i className="ti ti-chevron-right quick-nav-arrow" aria-hidden="true" />
        </Link>
      ))}
    </div>
  )
}

import MenuGrid from '../components/MenuGrid.jsx'
import LineAddCard from '../components/LineAddCard.jsx'
import { useAdminAuth } from '../context/AdminAuth.jsx'

/**
 * หน้า "รวมทุกเมนู" — เปิดหน้าเดียวเห็นทุกอย่างที่ระบบทำได้
 * แยกออกมาจากหน้าแรก เพราะหน้าแรกตั้งใจให้เหลือแค่ปุ่มไมค์จอเดียวจบ
 */
export default function MenuPage() {
  // บัตรแอดไลน์ขึ้นเฉพาะคนที่ล็อกอินแล้ว บัญชีนี้ส่งข้อมูลของฟาร์มเราโดยเฉพาะ
  const { isAdmin } = useAdminAuth()

  return (
    <div className="mn">
      <header className="mn-head">
        <span className="mn-head-icon"><i className="ti ti-layout-grid" aria-hidden="true" /></span>
        <div>
          <h1 className="mn-title">รวมทุกเมนู</h1>
          <p className="mn-sub">ทุกอย่างที่ระบบทำได้ อยู่ในหน้านี้หน้าเดียว</p>
        </div>
      </header>
      <MenuGrid />
      {isAdmin && <LineAddCard />}
    </div>
  )
}

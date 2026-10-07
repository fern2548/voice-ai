import MenuGrid from '../components/MenuGrid.jsx'

/**
 * หน้า "รวมทุกเมนู" — เปิดหน้าเดียวเห็นทุกอย่างที่ระบบทำได้
 * แยกออกมาจากหน้าแรก เพราะหน้าแรกตั้งใจให้เหลือแค่ปุ่มไมค์จอเดียวจบ
 */
export default function MenuPage() {
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
    </div>
  )
}

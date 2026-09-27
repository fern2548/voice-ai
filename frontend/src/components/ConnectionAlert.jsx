import { OFFLINE } from '../config.js'
import { useLiveData } from '../context/LiveData.jsx'

// เตือนเมื่อ "ต่อ backend ไม่ได้เลย" (คนละกรณีกับ SensorAlert ที่เตือนว่าข้อมูลเซนเซอร์เก่า)
export default function ConnectionAlert() {
  const { healthError } = useLiveData()

  // ฉบับแจกให้เปิดอ่าน ไม่ได้ต่อเซิร์ฟเวอร์อยู่แล้ว บอกไปตรง ๆ ดีกว่าขึ้นว่าต่อไม่ได้
  if (OFFLINE) {
    return (
      <div className="sensor-alert info" role="status">
        <i className="ti ti-book" aria-hidden="true" />
        <div className="sensor-alert-text">
          <div className="sensor-alert-title">ฉบับสำหรับเปิดอ่าน</div>
          <div className="sensor-alert-sub">
            เปิดดูเนื้อหาและเครื่องคำนวณได้ทุกหน้า · ส่วนที่ต้องดึงข้อมูลสดจากฟาร์มจะไม่มีตัวเลขขึ้น
          </div>
        </div>
      </div>
    )
  }

  if (!healthError) return null

  return (
    <div className="sensor-alert conn" role="alert">
      <i className="ti ti-plug-connected-x" aria-hidden="true" />
      <div className="sensor-alert-text">
        <div className="sensor-alert-title">เชื่อมต่อเซิร์ฟเวอร์ไม่ได้</div>
        <div className="sensor-alert-sub">
          ระบบยังแสดงข้อมูลล่าสุดที่ดึงได้ · กำลังพยายามเชื่อมต่อใหม่อัตโนมัติ
        </div>
      </div>
    </div>
  )
}

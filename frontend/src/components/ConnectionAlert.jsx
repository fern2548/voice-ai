import { useLiveData } from '../context/LiveData.jsx'

// เตือนเมื่อ "ต่อ backend ไม่ได้เลย" (คนละกรณีกับ SensorAlert ที่เตือนว่าข้อมูลเซนเซอร์เก่า)
export default function ConnectionAlert() {
  const { healthError } = useLiveData()
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

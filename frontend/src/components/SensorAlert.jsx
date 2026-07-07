import { useEffect, useState } from 'react'
import { useLiveData } from '../context/LiveData.jsx'
import { isStale } from '../utils/sensorStatus.js'

export default function SensorAlert() {
  const { weather: data } = useLiveData()
  const stale = isStale(data?.reading_time)
  const [dismissed, setDismissed] = useState(false)

  // ถ้าข้อมูลกลับมาปกติ ให้รีเซ็ตสถานะปิดไว้ เผื่อขาดหายอีกครั้งในอนาคตจะได้แจ้งเตือนใหม่
  useEffect(() => {
    if (!stale) setDismissed(false)
  }, [stale])

  if (!stale || dismissed) return null

  return (
    <div className="sensor-alert" role="alert">
      <i className="ti ti-alert-triangle" aria-hidden="true" />
      <div className="sensor-alert-text">
        <div className="sensor-alert-title">ไม่มีข้อมูลเข้ามา</div>
        <div className="sensor-alert-sub">
          {data?.reading_time ? `ข้อมูลล่าสุด ${data.reading_time}` : 'ยังไม่มีข้อมูลจากเซนเซอร์'} · กรุณาตรวจสอบเซนเซอร์
        </div>
      </div>
      <button className="sensor-alert-close" onClick={() => setDismissed(true)} aria-label="ปิดการแจ้งเตือน">
        <i className="ti ti-x" aria-hidden="true" />
      </button>
    </div>
  )
}

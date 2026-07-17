import { useEffect, useState } from 'react'
import { useTheme } from '../../theme.jsx'
import { useLiveData } from '../../context/LiveData.jsx'

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function StatusBar() {
  const { theme, toggle } = useTheme()
  const now = useClock()
  // ใช้ /health เป็นตัวชี้สถานะการเชื่อมต่อ backend + DB
  const { health, healthError } = useLiveData()
  const online = !healthError && health?.db === true

  return (
    <header className="statusbar">
      <div className="sb-left">
        <div className="sb-logo"><i className="ti ti-cloud-bolt" aria-hidden="true" /></div>
        <div>
          <div className="sb-title">ฟาร์มมี่ (FARMY)</div>
          <div className="sb-sub">SCADA MONITORING · SARABURI FARM</div>
        </div>
      </div>

      <div className="sb-right">
        <div className={`sb-conn ${online ? 'up' : 'down'}`}>
          <span className="conn-led" />
          {online ? 'CONNECTED' : 'NO SIGNAL'}
        </div>
        <div className="sb-clock">
          <div className="clock-time">{now.toLocaleTimeString('th-TH')}</div>
          <div className="clock-date">
            {now.toLocaleDateString('th-TH', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </div>
        <button className="theme-btn" onClick={toggle} title="สลับธีม">
          <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon'}`} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}

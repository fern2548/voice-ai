import { useEffect, useState } from 'react'
import { useTheme } from '../../theme.jsx'
import usePolling from '../../hooks/usePolling.js'
import { getWeather } from '../../api.js'

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
  // ใช้ผลการดึง /weather เป็นตัวชี้สถานะการเชื่อมต่อ
  const { updatedAt } = usePolling(getWeather, 30000)
  const online = updatedAt && Date.now() - updatedAt.getTime() < 90000

  return (
    <header className="statusbar">
      <div className="sb-left">
        <div className="sb-logo">◈</div>
        <div>
          <div className="sb-title">WEATHER STATION AI</div>
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
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}

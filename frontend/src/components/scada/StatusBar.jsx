import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../theme.jsx'
import { useLiveData } from '../../context/LiveData.jsx'
import { useAdminAuth } from '../../context/AdminAuth.jsx'
import { FarmyLogo } from '../FarmDecor.jsx'

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function StatusBar({ navItems = [], currentPath = '' }) {
  const { theme, setTheme } = useTheme()
  const now = useClock()
  const { username, logout } = useAdminAuth()
  // ใช้ /health เป็นตัวชี้สถานะการเชื่อมต่อ backend + DB
  const { health, healthError } = useLiveData()
  const online = !healthError && health?.db === true

  return (
    <header className="topbar">
      <Link to="/overview" className="brand">
        <div className="brand-logo"><FarmyLogo /></div>
        <div>
          <div className="brand-title">Farmy<span> Voice</span></div>
          <div className="brand-sub">VOICE AI FOR SMART PIG FARM</div>
        </div>
      </Link>

      <nav className="topnav">
        {navItems.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className={`topnav-item ${currentPath === n.to ? 'active' : ''}`}
          >
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="topbar-right">
        <div className={`sb-conn ${online ? 'up' : 'down'}`}>
          <span className="conn-led" />
          {online ? 'ระบบออนไลน์' : 'ไม่มีสัญญาณ'}
        </div>
        <div className="sb-clock">
          <div className="clock-time">{now.toLocaleTimeString('th-TH')}</div>
          <div className="clock-date">
            {now.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
        {/* สวิตช์ 2 โหมด: แสดงให้เห็นเลยว่าตอนนี้อยู่โหมดไหน ไม่ใช่ไอคอนเดี่ยวที่ต้องเดา */}
        <div className="theme-switch" role="group" aria-label="โหมดการแสดงผล">
          <button
            className={`theme-opt ${theme === 'light' ? 'on' : ''}`}
            onClick={() => setTheme('light')}
            aria-pressed={theme === 'light'}
            title="โหมดสว่าง"
          >
            <i className="ti ti-sun" aria-hidden="true" />
            <span className="theme-opt-label">สว่าง</span>
          </button>
          <button
            className={`theme-opt ${theme === 'dark' ? 'on' : ''}`}
            onClick={() => setTheme('dark')}
            aria-pressed={theme === 'dark'}
            title="โหมดมืด"
          >
            <i className="ti ti-moon" aria-hidden="true" />
            <span className="theme-opt-label">มืด</span>
          </button>
        </div>
        <div className="topbar-user">
          <i className="ti ti-user-circle" aria-hidden="true" />
          <span className="topbar-user-name">{username || 'Admin'}</span>
          <button className="topbar-logout" onClick={logout} title="ออกจากระบบ">
            <i className="ti ti-logout" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  )
}

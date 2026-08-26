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

/**
 * แถบบน — เก็บเมนูทั้งหมดไว้ในสามขีด ให้แถบโล่งเหมือนเว็บ Farmy Voice
 *
 * หมายเหตุ: แผงเมนู render ไว้ตลอดแล้วสลับ visibility/opacity ด้วยคลาส
 * ไม่ถอด element ออกจาก DOM เพราะถ้าใช้ transition แล้วเบราว์เซอร์หยุด animation
 * (เช่นผู้ใช้สลับไปแท็บอื่น) ฉากหลังใส ๆ จะค้างดักคลิกแทนเนื้อหาข้างหลัง
 */
export default function StatusBar({ navItems = [], currentPath = '' }) {
  const { theme, setTheme } = useTheme()
  const now = useClock()
  const { username, logout } = useAdminAuth()
  // ใช้ /health เป็นตัวชี้สถานะการเชื่อมต่อ backend + DB
  const { health, healthError } = useLiveData()
  const online = !healthError && health?.db === true
  const [open, setOpen] = useState(false)

  // กด Esc ปิดเมนู และล็อกการเลื่อนหน้าไว้ระหว่างเปิด
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  // เปลี่ยนหน้าแล้วปิดเมนูเอง (เผื่อกดปุ่มย้อนกลับของเบราว์เซอร์)
  useEffect(() => setOpen(false), [currentPath])

  return (
    <>
      <header className="topbar">
        <button
          type="button"
          className="menu-btn"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
        >
          <i className={`ti ${open ? 'ti-x' : 'ti-menu-2'}`} aria-hidden="true" />
        </button>

        <Link to="/overview" className="brand">
          <div className="brand-logo"><FarmyLogo /></div>
          <div className="brand-title">Farmy<span> Voice</span></div>
        </Link>

        <div className="topbar-right">
          {/* สวิตช์เลื่อนอันเดียว แบบเดียวกับเว็บ 5174 (สถานะออนไลน์ย้ายไปอยู่ในเมนู) */}
          <button
            type="button"
            className="theme-toggle"
            role="switch"
            aria-checked={theme === 'dark'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
            aria-label={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
          >
            <span className={`theme-knob ${theme === 'dark' ? 'right' : ''}`}>
              <i className={`ti ${theme === 'dark' ? 'ti-moon' : 'ti-sun'}`} aria-hidden="true" />
            </span>
          </button>
        </div>
      </header>

      {/* ฉากหลัง */}
      <div
        className={`menu-backdrop ${open ? 'on' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* แผงเมนู */}
      <nav className={`menu-panel ${open ? 'on' : ''}`}>
        <div className="menu-inner">
          <ul className="menu-list">
            {navItems.map((n, i) => (
              <li key={n.to} style={{ transitionDelay: open ? `${60 + i * 45}ms` : '0ms' }}>
                <Link
                  to={n.to}
                  tabIndex={open ? 0 : -1}
                  onClick={() => setOpen(false)}
                  className={currentPath === n.to ? 'active' : ''}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="menu-foot">
            <div className={`sb-conn ${online ? 'up' : 'down'}`}>
              <span className="conn-led" />
              {online ? 'ระบบออนไลน์' : 'ไม่มีสัญญาณ'}
            </div>
            <div className="menu-clock">
              {now.toLocaleTimeString('th-TH')} ·{' '}
              {now.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <div className="menu-user">
              <i className="ti ti-user-circle" aria-hidden="true" />
              <span>{username || 'Admin'}</span>
              <button onClick={logout} title="ออกจากระบบ">
                <i className="ti ti-logout" aria-hidden="true" /> ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}

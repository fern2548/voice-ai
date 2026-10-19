import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../theme.jsx'
import { useLiveData } from '../../context/LiveData.jsx'
import { useAdminAuth } from '../../context/AdminAuth.jsx'
import { FarmyLogo } from '../FarmDecor.jsx'
import { MENU_BOTTOM, MENU_TOP, visibleGroups, visibleItems } from '../../data/menu.js'

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
export default function StatusBar({ currentPath = '' }) {
  const { theme, setTheme } = useTheme()
  const now = useClock()
  const { username, logout, isAdmin, role } = useAdminAuth()
  // ใช้ /health เป็นตัวชี้สถานะการเชื่อมต่อ backend + DB
  const { health, healthError } = useLiveData()
  const online = !healthError && health?.db === true

  // ประกอบเมนูเป็นหมวด ๆ แล้วแปะเลขลำดับรวมไว้ ใช้หน่วงเวลาตอนเมนูไถลออกมาทีละบรรทัด
  let seq = 0
  const sections = [
    { title: '', items: visibleItems(MENU_TOP, isAdmin) },
    ...visibleGroups(isAdmin),
    { title: '', items: visibleItems(MENU_BOTTOM, isAdmin) },
  ]
    .filter((sec) => sec.items.length)
    .map((sec) => ({ ...sec, items: sec.items.map((it) => ({ ...it, _i: seq++ })) }))
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
          {/* แบ่งหมวดและใส่ไอคอน — ของเดิมเป็นรายการยาว 19 บรรทัดเรียงติดกัน
              ไม่มีอะไรช่วยให้กวาดตาหาเจอ ต้องไล่อ่านทีละบรรทัดทุกครั้ง */}
          <div className="menu-secs">
          {sections.map((sec) => (
            <div className="menu-sec" key={sec.title || `x${sec.items[0].to}`}>
              {sec.title && <div className="menu-sec-title">{sec.title}</div>}
              <ul className="menu-list">
                {sec.items.map((n) => (
                  <li key={n.to} style={{ transitionDelay: open ? `${60 + n._i * 30}ms` : '0ms' }}>
                    <Link
                      to={n.to}
                      tabIndex={open ? 0 : -1}
                      onClick={() => setOpen(false)}
                      className={currentPath === n.to ? 'active' : ''}
                    >
                      <i className={`ti ${n.icon}`} aria-hidden="true" />
                      <span>{n.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          </div>

          <div className="menu-foot">
            <div className={`sb-conn ${online ? 'up' : 'down'}`}>
              <span className="conn-led" />
              {online ? 'ระบบออนไลน์' : 'ไม่มีสัญญาณ'}
            </div>
            <div className="menu-clock">
              {now.toLocaleTimeString('th-TH')} ·{' '}
              {now.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            {isAdmin ? (
              <div className="menu-user">
                <i className="ti ti-user-circle" aria-hidden="true" />
                <span>{username || 'Admin'}{role === 'admin' && <small className="menu-role">ผู้ดูแล</small>}</span>
                <button onClick={logout} title="ออกจากระบบ">
                  <i className="ti ti-logout" aria-hidden="true" /> ออกจากระบบ
                </button>
              </div>
            ) : (
              <div className="menu-user">
                <i className="ti ti-user" aria-hidden="true" />
                <span>ผู้เยี่ยมชม</span>
                <Link to="/vaccine" onClick={() => setOpen(false)} className="menu-login" title="เข้าสู่ระบบสำหรับคนในบริษัท">
                  <i className="ti ti-login" aria-hidden="true" /> เข้าสู่ระบบ
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}

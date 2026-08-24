import { useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { AudioLines, Menu, X } from 'lucide-react'
import ThemeToggle from './ThemeToggle.jsx'

// เมนูทั้งหมดอยู่ในสามขีดที่เดียว แถบบนจึงเหลือแค่โลโก้กับปุ่มสลับธีม
const navItems = [
  { to: '/', label: 'หน้าแรก', end: true },
  { to: '/features', label: 'ทำอะไรได้บ้าง' },
  { to: '/barns', label: 'โรงเรือน' },
  { to: '/health', label: 'สุขภาพสุกร' },
  { to: '/vaccines', label: 'วัคซีน' },
  { to: '/reports', label: 'รายงาน' },
  { to: '/weather', label: 'พยากรณ์อากาศ' },
  { to: '/settings', label: 'ตั้งค่า' },
]

/**
 * แถบบน + แผงเมนูสามขีด
 *
 * หมายเหตุการทำงาน: แผงเมนูไม่ได้ใช้ AnimatePresence แต่ render ไว้ตลอดแล้วสลับ
 * opacity / visibility / pointer-events ด้วยคลาส CSS
 * เพราะถ้าใช้ exit animation แล้วเบราว์เซอร์หยุด requestAnimationFrame
 * (เช่นผู้ใช้สลับไปแท็บอื่น) ฉากหลังใส ๆ จะค้างดักคลิกแทนเนื้อหาข้างหลัง
 * ส่วนคลาสจะสลับทันทีเสมอ ไม่ขึ้นกับว่า animation ทำงานหรือไม่
 *
 * @param {{isDark: boolean, onToggleTheme: () => void, open: boolean, onOpenChange: (v: boolean) => void}} props
 */
export default function Navbar({ isDark, onToggleTheme, open, onOpenChange }) {
  // กด Esc ปิดเมนู และล็อกการเลื่อนหน้าไว้ระหว่างเปิด
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onOpenChange(false)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onOpenChange])

  const gate = open ? 'visible opacity-100' : 'invisible opacity-0'

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="stage flex h-[72px] items-center">
          <button
            type="button"
            onClick={() => onOpenChange(!open)}
            aria-expanded={open}
            aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-fg transition-colors duration-500 hover:bg-fg/5"
          >
            {open ? (
              <X className="h-[22px] w-[22px]" strokeWidth={1.6} />
            ) : (
              <Menu className="h-[22px] w-[22px]" strokeWidth={1.6} />
            )}
          </button>

          <Link
            to="/"
            onClick={() => onOpenChange(false)}
            className="ml-3 flex items-center gap-2.5"
          >
            <AudioLines className="h-[21px] w-[21px] text-accent" strokeWidth={1.6} />
            <span className="text-[17px] font-medium tracking-tight">Farmy Voice</span>
          </Link>

          <div className="ml-auto">
            <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
          </div>
        </div>
      </header>

      {/* ฉากหลัง */}
      <div
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-base/70 backdrop-blur-xl transition-opacity duration-500 ${gate}`}
      />

      {/* แผงเมนู */}
      <nav
        // ระบุ property ที่ทรานซิชันให้ชัด ห้ามใช้ transition-all
        // เพราะจะไปหน่วง visibility ด้วย ทำให้แผงเปิดแล้วแต่ยังมองไม่เห็น
        className={`fixed inset-x-0 top-[72px] z-40 max-h-[calc(100svh-72px)] overflow-y-auto transition-[opacity,transform] duration-500 ${gate} ${
          open ? 'translate-y-0' : '-translate-y-3'
        }`}
      >
        <div className="stage py-8">
          <ul className="flex max-w-sm flex-col">
            {navItems.map((item, i) => (
              <li
                key={item.to}
                className={`transition-[opacity,transform] duration-500 ${open ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
                style={{ transitionDelay: open ? `${60 + i * 45}ms` : '0ms' }}
              >
                <NavLink
                  to={item.to}
                  end={item.end}
                  tabIndex={open ? 0 : -1}
                  onClick={() => onOpenChange(false)}
                  className={({ isActive }) =>
                    [
                      'block border-b border-line/50 py-3.5 text-[clamp(19px,1.6vw,26px)] font-light tracking-tight transition-colors duration-500',
                      isActive ? 'text-accent' : 'text-fg hover:text-accent',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div
            className={`mt-7 flex items-center gap-2 text-[13px] font-light text-muted transition-opacity duration-500 ${
              open ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionDelay: open ? '400ms' : '0ms' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            ระบบออนไลน์ · ผู้ดูแลระบบ
          </div>
        </div>
      </nav>
    </>
  )
}

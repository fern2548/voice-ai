import { Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import Features from './pages/Features.jsx'
import Barns from './pages/Barns.jsx'
import Vaccines from './pages/Vaccines.jsx'
import Health from './pages/Health.jsx'
import Reports from './pages/Reports.jsx'
import Weather from './pages/Weather.jsx'
import Settings from './pages/Settings.jsx'
import useTheme from './hooks/useTheme.js'

export default function App() {
  const { isDark, toggleTheme } = useTheme()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // เปลี่ยนหน้าแล้วกลับไปบนสุดเสมอ และปิดเมนูให้ด้วย
  // (กันกรณีกดปุ่มย้อนกลับของเบราว์เซอร์ขณะเมนูเปิดค้างอยู่)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen">
      <Navbar
        isDark={isDark}
        onToggleTheme={toggleTheme}
        open={menuOpen}
        onOpenChange={setMenuOpen}
      />

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/barns" element={<Barns />} />
          <Route path="/vaccines" element={<Vaccines />} />
          <Route path="/health" element={<Health />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/weather" element={<Weather />} />
          <Route path="/settings" element={<Settings isDark={isDark} onToggleTheme={toggleTheme} />} />
          {/* พิมพ์ URL มั่วก็ยังกลับมาหน้าแรก ไม่เจอจอขาว */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      {/* หน้าแรกตั้งใจให้เป็นจอเดียวจบ ไม่มีอะไรให้เลื่อน จึงไม่แสดง footer
          (หน้าแรกมีบรรทัดท้ายจอของตัวเองอยู่แล้ว) */}
      {location.pathname !== '/' && (
        <footer className="border-t border-line/40 py-14">
          <div className="stage flex flex-col items-center gap-2 text-center">
            <span className="text-[15px] font-medium tracking-tight">Farmy Voice</span>
            <span className="text-[13px] font-light text-faint">Voice AI for Smart Pig Farm</span>
          </div>
        </footer>
      )}
    </div>
  )
}

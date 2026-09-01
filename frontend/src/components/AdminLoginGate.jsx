import { useState } from 'react'
import { useAdminAuth } from '../context/AdminAuth.jsx'
import { useTheme } from '../theme.jsx'
import { FarmyLogo } from './FarmDecor.jsx'

// บล็อกทั้งเว็บไว้จนกว่าจะล็อกอินสำเร็จ — ใช้ตอน deploy ขึ้น URL สาธารณะ
// กันคนนอกที่ไม่รู้รหัสผ่านเข้ามาดูข้อมูลฟาร์ม
export default function AdminLoginGate({ children }) {
  const { isAdmin, login } = useAdminAuth()
  const { theme, setTheme } = useTheme()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (isAdmin) return children

  const submit = async (e) => {
    e.preventDefault()
    if (busy || !password.trim()) return
    setBusy(true)
    setError('')
    try {
      await login(username.trim(), password)
    } catch (err) {
      // แยกสองกรณีให้ผู้ใช้รู้ว่าควรทำอะไรต่อ: กรอกผิด vs ต่อเซิร์ฟเวอร์ไม่ได้
      // (เซิร์ฟเวอร์แพ็กเกจฟรีจะหลับเมื่อไม่มีคนใช้ ครั้งแรกจึงช้าและอาจ timeout)
      const offline = err instanceof TypeError || /fetch|network/i.test(err?.message || '')
      setError(
        offline
          ? 'ติดต่อเซิร์ฟเวอร์ไม่ได้ — เซิร์ฟเวอร์อาจกำลังเริ่มทำงาน รอสักครู่แล้วลองใหม่'
          // ใช้ข้อความจากเซิร์ฟเวอร์ถ้ามี จะได้เห็นว่าเหลือกี่ครั้ง หรือถูกล็อกนานเท่าไหร่
          : err?.detail || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="lg-page">
      <div className="lg-glow" aria-hidden="true" />

      {/* สลับธีมได้ตั้งแต่ยังไม่ล็อกอิน คนที่ตาไวแสงจะได้ไม่ต้องทนจอสว่างก่อน */}
      <button
        type="button"
        className="lg-theme"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        title={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
        aria-label={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
      >
        <i className={`ti ${theme === 'dark' ? 'ti-moon' : 'ti-sun'}`} aria-hidden="true" />
      </button>

      <form className="lg-card" onSubmit={submit}>
        <div className="lg-brand">
          <span className="lg-logo"><FarmyLogo /></span>
          <span className="lg-name">Farmy<span> Voice</span></span>
        </div>

        <h1 className="lg-title">เข้าสู่ระบบ</h1>
        <p className="lg-sub">ระบบจัดการฟาร์มสุกรด้วยเสียง</p>

        <label className="lg-field">
          <span className="lg-label">ชื่อผู้ใช้</span>
          <input
            type="text"
            className="lg-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck="false"
            disabled={busy}
          />
        </label>

        <label className="lg-field">
          <span className="lg-label">รหัสผ่าน</span>
          <span className="lg-input-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              className="lg-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={busy}
              autoFocus
            />
            <button
              type="button"
              className="lg-eye"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
            >
              <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
            </button>
          </span>
        </label>

        {/* จองที่ไว้ตลอด ไม่ให้ปุ่มขยับตอนมี error โผล่ */}
        <div className="lg-error-slot" role="alert" aria-live="polite">
          {error && (
            <div className="lg-error">
              <i className="ti ti-alert-circle" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <button type="submit" className="lg-submit" disabled={busy || !password.trim()}>
          {busy ? (
            <>
              <span className="lg-spinner" aria-hidden="true" />
              กำลังเข้าสู่ระบบ…
            </>
          ) : (
            'เข้าสู่ระบบ'
          )}
        </button>

        <p className="lg-hint">
          เปิดครั้งแรกอาจใช้เวลาสักครู่ เนื่องจากเซิร์ฟเวอร์กำลังเริ่มทำงาน
        </p>
      </form>
    </div>
  )
}

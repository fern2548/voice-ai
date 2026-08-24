import { useState } from 'react'
import { useAdminAuth } from '../context/AdminAuth.jsx'

// บล็อกทั้งเว็บไว้จนกว่าจะล็อกอิน admin สำเร็จ — ใช้ตอน deploy ขึ้น URL สาธารณะ
// กันคนนอกที่ไม่รู้รหัสผ่านเข้ามาดูข้อมูลฟาร์มได้
export default function AdminLoginGate({ children }) {
  const { isAdmin, login } = useAdminAuth()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (isAdmin) return children

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(username, password)
    } catch {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-gate">
      <form className="login-gate-card" onSubmit={submit}>
        <div className="login-gate-icon" aria-hidden="true">🐖</div>
        <div className="login-gate-title">ฟาร์มมี่ (Farmy)</div>
        <div className="login-gate-sub">กรุณาเข้าสู่ระบบเพื่อใช้งาน</div>
        <input
          type="text"
          className="chat-input login-gate-input"
          placeholder="ชื่อผู้ใช้"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          className="chat-input login-gate-input"
          placeholder="รหัสผ่าน"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="ask-btn login-gate-submit" disabled={busy}>
          {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </button>
        {error && <div className="login-gate-error">{error}</div>}
      </form>
    </div>
  )
}

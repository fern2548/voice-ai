import { createContext, useContext, useEffect, useState } from 'react'
import { apiUrl } from '../config.js'

const TOKEN_KEY = 'admin-token'
const USERNAME_KEY = 'admin-username'
const ROLE_KEY = 'admin-role'
const VET_KEY = 'admin-is-vet'
const AdminAuthContext = createContext(null)

// backend เก็บ token ไว้ใน memory -> restart ทีไร token ในเบราว์เซอร์ก็ใช้ไม่ได้ทันที
// ถ้าไม่เคลียร์ทิ้ง หน้าเว็บจะยังคิดว่าล็อกอินอยู่ แล้วทุกคำสั่งจะพังเงียบ ๆ (401)
// เลยต้อง 1) ตรวจ token ตอนเปิดเว็บ 2) ถ้าเจอ 401 ระหว่างใช้งาน ให้เด้งกลับหน้า login ทันที
function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
  localStorage.removeItem(ROLE_KEY)
}

async function loginRequest(username, password) {
  const res = await fetch(apiUrl('/admin/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    // ส่งข้อความจากเซิร์ฟเวอร์ต่อไปด้วย เช่น "เหลืออีก 2 ครั้งก่อนถูกล็อก"
    // หรือ "ลองผิดหลายครั้งเกินไป กรุณารออีก 15 นาที" ถ้าทิ้งไปผู้ใช้จะไม่รู้ว่าเกิดอะไรขึ้น
    const detail = await res.json().then((d) => d?.detail).catch(() => null)
    const err = new Error(detail || 'invalid credentials')
    err.status = res.status
    err.detail = detail
    throw err
  }
  return res.json()
}

async function signupRequest(username, password, code) {
  const res = await fetch(apiUrl('/admin/signup'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, code }),
  })
  if (!res.ok) {
    const detail = await res.json().then((d) => d?.detail).catch(() => null)
    const err = new Error(detail || 'signup failed')
    err.status = res.status
    err.detail = detail
    throw err
  }
  return res.json()
}

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [username, setUsername] = useState(() => localStorage.getItem(USERNAME_KEY) || '')
  // guest = ไม่ได้ล็อกอิน (คนนอก ดูข้อมูลปกติได้) · staff = คนในบริษัท · admin = ผู้ดูแลระบบ
  const [role, setRole] = useState(() => localStorage.getItem(ROLE_KEY) || 'guest')
  // เป็นสัตวแพทย์ไหม (ตั้งที่ VET_USERS ฝั่งเซิร์ฟเวอร์) — ใช้ตัดสินว่าโชว์ปุ่ม "รับดูแลเคส" ไหม
  const [isVet, setIsVet] = useState(() => localStorage.getItem(VET_KEY) === '1')
  const [checking, setChecking] = useState(() => !!localStorage.getItem(TOKEN_KEY))

  // ตรวจ token ที่ค้างอยู่ตอนเปิดเว็บ ว่า backend ยังรู้จักไหม
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (!stored) return
    let alive = true
    fetch(apiUrl('/admin/whoami'), { headers: { 'X-Admin-Token': stored } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return
        if (!d?.logged_in) {
          clearStoredSession()
          setToken('')
          setUsername('')
          setRole('guest')
        } else {
          if (d.role) {
            localStorage.setItem(ROLE_KEY, d.role)
            setRole(d.role)
          }
          localStorage.setItem(VET_KEY, d.is_vet ? '1' : '0')
          setIsVet(!!d.is_vet)
        }
      })
      .catch(() => {}) // ต่อ backend ไม่ได้ชั่วคราว -> ไม่เตะออก รอให้ลองใหม่เอง
      .finally(() => alive && setChecking(false))
    return () => { alive = false }
  }, [])

  // เมื่อมี fetch ไหนได้ 401 ระหว่างใช้งาน -> ถือว่า session หมดอายุ เด้งกลับหน้า login
  useEffect(() => {
    const onExpired = () => {
      clearStoredSession()
      setToken('')
      setUsername('')
      setRole('guest')
    }
    window.addEventListener('admin-session-expired', onExpired)
    return () => window.removeEventListener('admin-session-expired', onExpired)
  }, [])

  const acceptSession = (d) => {
    localStorage.setItem(TOKEN_KEY, d.token)
    localStorage.setItem(USERNAME_KEY, d.username)
    localStorage.setItem(ROLE_KEY, d.role || 'staff')
    setToken(d.token)
    setUsername(d.username)
    setRole(d.role || 'staff')
    setChecking(false)
  }

  const login = async (user, password) => acceptSession(await loginRequest(user, password))

  // สมัครสำเร็จแล้วเข้าระบบให้เลย ผู้ใช้จะได้ไม่ต้องกรอกชื่อกับรหัสซ้ำอีกรอบ
  const signup = async (user, password, code) =>
    acceptSession(await signupRequest(user, password, code))

  const logout = () => {
    if (token) {
      fetch(apiUrl('/admin/logout'), {
        method: 'POST',
        headers: { 'X-Admin-Token': token },
      }).catch(() => {})
    }
    clearStoredSession()
    setToken('')
    setUsername('')
    setRole('guest')
  }

  // isAdmin = ล็อกอินแล้ว (ชื่อเดิม ใช้ทั่วโค้ด) · isSuperAdmin = ผู้ดูแลระบบจริง ๆ
  const value = { isAdmin: !!token, isSuperAdmin: role === 'admin', isVet, role, token, username, login, signup, logout, checking }
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return ctx
}

// helper: แนบ header token อัตโนมัติสำหรับ fetch ที่ต้อง auth เป็น admin
export function adminHeaders() {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { 'X-Admin-Token': token } : {}
}

// ให้ api.js เรียกเมื่อเจอ 401 เพื่อแจ้งว่า session หมดอายุแล้ว
export function notifySessionExpired() {
  window.dispatchEvent(new Event('admin-session-expired'))
}

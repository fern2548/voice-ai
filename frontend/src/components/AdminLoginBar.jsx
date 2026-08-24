import { useAdminAuth } from '../context/AdminAuth.jsx'

// AdminLoginGate บล็อกทั้งแอปไว้จนกว่าจะล็อกอินแล้ว ตัวนี้เลยแสดงแค่สถานะ + ปุ่มออกจากระบบ
export default function AdminLoginBar() {
  const { username, logout } = useAdminAuth()

  return (
    <div className="admin-bar">
      <div className="admin-bar-on">
        <i className="ti ti-shield-check" aria-hidden="true" />
        <span className="admin-bar-label">{username || 'Admin'}</span>
        <button className="admin-bar-logout" onClick={logout} title="ออกจากระบบ">
          <i className="ti ti-logout" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

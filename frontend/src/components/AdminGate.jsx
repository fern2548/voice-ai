import { useAdminAuth } from '../context/AdminAuth.jsx'

// ครอบฟอร์มที่ต้องแก้ไขข้อมูล — โชว์เฉพาะตอนล็อกอิน admin แล้ว ไม่งั้นขึ้นข้อความให้ไปล็อกอินก่อน
export default function AdminGate({ children }) {
  const { isAdmin } = useAdminAuth()
  if (isAdmin) return children
  return (
    <div className="admin-gate-locked">
      <i className="ti ti-lock" aria-hidden="true" />
      ต้องเข้าสู่ระบบ Admin ก่อนถึงจะแก้ไขข้อมูลได้ (ล็อกอินที่เมนูซ้ายด้านล่าง)
    </div>
  )
}

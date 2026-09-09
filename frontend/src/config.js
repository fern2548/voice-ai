// ที่อยู่ของ backend
// - ตอน dev ปล่อยว่าง แล้วให้ proxy ใน vite.config.js ส่งต่อไป localhost:8000
// - ตอน deploy ขึ้นเว็บจริง ตั้ง VITE_API_BASE เป็น URL ของ backend เช่น https://farmy-api.onrender.com
export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

// ต่อ path ให้เป็น URL เต็มของ backend
export const apiUrl = (path) => `${API_BASE}${path}`

// ปลุกเซิร์ฟเวอร์ทันทีที่เปิดเว็บ
// Render แพ็กเกจฟรีจะ "หลับ" เมื่อไม่มีใครใช้ 15 นาที คำขอแรกหลังหลับต้องรอ 30-60 วิให้ตื่น
// ถ้าไม่ปลุกไว้ก่อน ผู้ใช้จะกดไมค์ถามแล้วเจอ "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" ทั้งที่ระบบปกติดี
// ยิงตั้งแต่ตอนเปิดหน้า ระหว่างที่ผู้ใช้ยังอ่าน/กดไมค์อยู่ เซิร์ฟเวอร์ก็ตื่นทันพอดี
export function wakeBackend() {
  if (!API_BASE) return // dev ในเครื่อง ไม่ต้องปลุก
  fetch(apiUrl('/health')).catch(() => {})
}

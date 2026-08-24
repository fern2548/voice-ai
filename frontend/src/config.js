// ที่อยู่ของ backend
// - ตอน dev ปล่อยว่าง แล้วให้ proxy ใน vite.config.js ส่งต่อไป localhost:8000
// - ตอน deploy ขึ้นเว็บจริง ตั้ง VITE_API_BASE เป็น URL ของ backend เช่น https://farmy-api.onrender.com
export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

// ต่อ path ให้เป็น URL เต็มของ backend
export const apiUrl = (path) => `${API_BASE}${path}`

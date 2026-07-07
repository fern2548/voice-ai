// reading_time จาก backend เป็นสตริงเวลาไทย รูปแบบ "dd/mm/yyyy HH:MM:SS"
// แปลงเป็น epoch ms (UTC จริง) เพื่อเทียบกับเวลาปัจจุบันของเบราว์เซอร์ได้ตรง ๆ
export function parseReadingTime(str) {
  if (!str) return null
  const m = String(str).match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/)
  if (!m) return null
  const [, dd, mm, yyyy, hh, min, ss] = m.map(Number)
  // ค่าที่ backend ส่งมาเป็นเวลาไทย (UTC+7) แปลงกลับเป็น UTC epoch
  return Date.UTC(yyyy, mm - 1, dd, hh, min, ss) - 7 * 60 * 60 * 1000
}

export const STALE_MS = 10 * 60 * 1000 // ถือว่าข้อมูลขาดหาย ถ้าไม่มีค่าใหม่เกิน 10 นาที

export function isStale(readingTime) {
  const t = parseReadingTime(readingTime)
  if (t == null) return true
  return Date.now() - t > STALE_MS
}

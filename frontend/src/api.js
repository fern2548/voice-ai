// ฟังก์ชันเรียก API ทั้งหมดรวมไว้ที่เดียว
import { adminHeaders, notifySessionExpired } from './context/AdminAuth.jsx'
import { apiUrl } from './config.js'

// 401 = token หมดอายุ (backend restart) -> แจ้งให้เด้งกลับหน้า login แทนที่จะพังเงียบ ๆ
function checkAuth(res) {
  if (res.status === 401) notifySessionExpired()
}

async function get(url) {
  const res = await fetch(apiUrl(url), { headers: adminHeaders() })
  checkAuth(res)
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res.json()
}

// แนบ X-Admin-Token ให้เองถ้าล็อกอิน admin ไว้ (endpoint ที่ไม่ต้องใช้ก็แค่เพิกเฉย header นี้ ไม่มีผลอะไร)
async function post(url, body) {
  const res = await fetch(apiUrl(url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify(body),
  })
  checkAuth(res)
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res.json()
}

async function del(url) {
  const res = await fetch(apiUrl(url), { method: 'DELETE', headers: adminHeaders() })
  checkAuth(res)
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res.json()
}

// สร้าง query string ของ endpoint แบบแบ่งหน้า (ใช้ร่วมกันหลาย log endpoint)
function logQuery(path, { page = 0, pageSize = 100, hours } = {}) {
  const params = new URLSearchParams({ page, page_size: pageSize })
  if (hours) params.set('hours', hours)
  return get(`${path}?${params.toString()}`)
}

export const getHealth = () => get('/health')
export const getWeather = () => get('/weather')
export const getHistory = () => get('/history')
export const getPredict = () => get('/predict')

export const getReadingsLog = (opts) => logQuery('/readings-log', opts)
export const getPredictionsLog = (opts) => logQuery('/predictions-log', opts)

export const getPigHealthLog = (opts) => logQuery('/pig-health-log', opts)
export const savePigHealth = (entry) => post('/pig-health', entry)

export const getVaccineHistory = (opts) => logQuery('/vaccine-history', opts)
export const saveVaccineLog = (entry) => post('/vaccine-log', entry)

export const sendVaccineReportToLine = () => post('/line/send-vaccine-report', {})
export const getVaccineSchedule = () => get('/vaccine-schedule')
export const getVaccineDue = (days = 7) => get(`/vaccine-due?days=${days}`)

// history: อาร์เรย์ของ { role: 'user'|'model', text } ไม่กี่เทิร์นล่าสุด (ประหยัด token)
export const askAI = (text, history = []) => post('/ask', { text, history })

export const changeAdminPassword = (current_password, new_password) =>
  post('/admin/change-password', { current_password, new_password })
export const getAdminUsers = () => get('/admin/users')
export const createAdminUser = (username, password) => post('/admin/users', { username, password })
export const deleteAdminUser = (username) => del(`/admin/users/${encodeURIComponent(username)}`)

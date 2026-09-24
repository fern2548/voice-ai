// ฟังก์ชันเรียก API ทั้งหมดรวมไว้ที่เดียว
import { adminHeaders, notifySessionExpired } from './context/AdminAuth.jsx'
import { apiUrl } from './config.js'

// 401 = ยังไม่ได้ล็อกอิน/เซสชันหมดอายุ -> เด้งกลับหน้า login แทนที่จะพังเงียบ ๆ
function checkAuth(res) {
  if (res.status === 401) notifySessionExpired()
}

// แนบสถานะ HTTP ไปกับ error ด้วย ฝั่งที่เรียกจะได้แยกได้ว่า
// "เซสชันหมดอายุ" (401) กับ "ต่อเซิร์ฟเวอร์ไม่ได้" ซึ่งต้องบอกผู้ใช้คนละแบบ
function httpError(url, res) {
  const err = new Error(`${url} -> ${res.status}`)
  err.status = res.status
  return err
}

async function get(url) {
  const res = await fetch(apiUrl(url), { headers: adminHeaders() })
  checkAuth(res)
  if (!res.ok) throw httpError(url, res)
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
  if (!res.ok) {
    // เซิร์ฟเวอร์ส่งเหตุผลมาใน detail (เช่น "เอกสารสั้นเกินไป") — แนบไปให้หน้าจอโชว์ได้
    const err = httpError(url, res)
    try { err.detail = (await res.json()).detail || '' } catch { /* ไม่ใช่ JSON */ }
    throw err
  }
  return res.json()
}

async function del(url) {
  const res = await fetch(apiUrl(url), { method: 'DELETE', headers: adminHeaders() })
  checkAuth(res)
  if (!res.ok) throw httpError(url, res)
  return res.json()
}

// สร้าง query string ของ endpoint แบบแบ่งหน้า (ใช้ร่วมกันหลาย log endpoint)
function logQuery(path, { page = 0, pageSize = 100, hours } = {}) {
  const params = new URLSearchParams({ page, page_size: pageSize })
  if (hours) params.set('hours', hours)
  return get(`${path}?${params.toString()}`)
}

// หน้าล็อกอินถามว่าเปิดให้สมัครเองไหม — เรียกได้โดยไม่ต้องล็อกอิน
export const getSignupEnabled = () =>
  fetch(apiUrl('/admin/signup-enabled')).then((r) => (r.ok ? r.json() : { enabled: false }))

export const getHealth = () => get('/health')
export const getWeather = () => get('/weather')
export const getHistory = () => get('/history')
export const getPredict = () => get('/predict')

export const getReadingsLog = (opts) => logQuery('/readings-log', opts)
export const getPredictionsLog = (opts) => logQuery('/predictions-log', opts)

export const getPigHealthLog = (opts) => logQuery('/pig-health-log', opts)
export const savePigHealth = (entry) => post('/pig-health', entry)

// ประวัติการฉีด + ตัวกรอง (ช่วงวัน โรงเรือน วัคซีน สถานะสุกร) — ค่าว่างไม่ส่ง
export const getVaccineHistory = ({ page = 0, pageSize = 100, filters = {} } = {}) => {
  const params = new URLSearchParams({ page, page_size: pageSize })
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
  return get(`/vaccine-history?${params.toString()}`)
}
// ทะเบียนวัคซีน (หมวด 1) + ตัวเลขหัวหน้า
export const getVaccineProducts = () => get('/vaccine-products')
export const saveVaccineProduct = (p) => post('/vaccine-products', p)
export const deleteVaccineProduct = (id) => del(`/vaccine-products/${id}`)
export const getVaccineStats = () => get('/vaccine-stats')
// แผนวัคซีนตามอายุ: ชุดหมู × โปรแกรม
export const getPigBatches = () => get('/pig-batches')
export const savePigBatch = (b) => post('/pig-batches', b)
export const deletePigBatch = (id) => del(`/pig-batches/${id}`)
export const getVaccinePrograms = () => get('/vaccine-programs')
export const saveVaccineProgram = (p) => post('/vaccine-programs', p)
export const useDefaultProgram = () => post('/vaccine-programs/use-default', {})
export const deleteVaccineProgram = (id) => del(`/vaccine-programs/${id}`)
export const getBatchPlan = (days = 7) => get(`/batch-plan?days=${days}`)
export const markPlanDone = (batch_id, program_id, booster_no = 0) => post('/batch-plan/done', { batch_id, program_id, booster_no })
export const saveVaccineLog = (entry) => post('/vaccine-log', entry)

export const sendVaccineReportToLine = () => post('/line/send-vaccine-report', {})
export const getVaccineSchedule = () => get('/vaccine-schedule')

// ติดตามอาการหลังฉีดวัคซีน
export const getFollowupDue = (daysAhead = 0) => get(`/vaccine-followup-due?days_ahead=${daysAhead}`)
export const getFollowups = (logId) => get(logId ? `/vaccine-followup?log_id=${logId}` : '/vaccine-followup')
export const saveFollowup = (entry) => post('/vaccine-followup', entry)
export const deleteFollowup = (id) => del(`/vaccine-followup/${id}`)
export const setVetStatus = (username, status) => post(`/admin/users/${encodeURIComponent(username)}/vet-status`, { status })

// งานที่ต้องทำวันนี้
export const getTasks = (day) => get(`/farm-tasks${day ? `?day=${day}` : ''}`)
export const createTask = (t) => post('/farm-tasks', t)
export const claimTask = (id) => post(`/farm-tasks/${id}/claim`, {})
export const recordTaskResult = (id, r) => post(`/farm-tasks/${id}/result`, r)
export const postponeTask = (id, due_date, reason) => post(`/farm-tasks/${id}/postpone`, { due_date, reason })
export const deleteTask = (id) => del(`/farm-tasks/${id}`)

// ชุมชนปรึกษาสัตวแพทย์
export const getVetPosts = ({ status, page = 0, pageSize = 20 } = {}) =>
  get(`/vet-posts?${new URLSearchParams({ ...(status ? { status } : {}), page, page_size: pageSize })}`)
export const getVetPost = (id) => get(`/vet-posts/${id}`)
export const createVetPost = (p) => post('/vet-posts', p)
export const deleteVetPost = (id) => del(`/vet-posts/${id}`)
export const addVetComment = (id, body) => post(`/vet-posts/${id}/comments`, { body })
export const claimVetPost = (id) => post(`/vet-posts/${id}/claim`, {})
export const closeVetPost = (id, close_note = null) => post(`/vet-posts/${id}/close`, { close_note })
export const reopenVetPost = (id) => post(`/vet-posts/${id}/reopen`, {})

export const getVaccineDue = (days = 7) => get(`/vaccine-due?days=${days}`)
// กด "เสร็จแล้ว" ที่การ์ดแจ้งเตือน (undo = เอากลับมาเตือนใหม่)
export const markVaccineDueDone = (id, undo = false) => post(`/vaccine-due/${id}/done?undo=${undo ? 'true' : 'false'}`, {})

// เซนเซอร์ภายนอก (ดินแสลงพัน · เล้าหมูกำแพงเพชร · เสาอากาศแสลงพัน) ผ่านเซิร์ฟเวอร์เรา
export const getLabSources = () => get('/lab/sources')
// location ว่าง = ทุกจุดติดตั้ง
const loc = (l) => (l ? `&location=${encodeURIComponent(l)}` : '')
export const getLabLatest = (source, location = '') =>
  get(`/lab/latest?source=${encodeURIComponent(source)}${loc(location)}`)
export const getLabSummary = (source, hours = 24, location = '') =>
  get(`/lab/summary?source=${encodeURIComponent(source)}&hours=${hours}${loc(location)}`)
export const getLabSeries = (source, measure, hours = 24, location = '') =>
  get(`/lab/series?source=${encodeURIComponent(source)}&measure=${encodeURIComponent(measure)}&hours=${hours}${loc(location)}`)

// history: อาร์เรย์ของ { role: 'user'|'model', text } ไม่กี่เทิร์นล่าสุด (ประหยัด token)
export const askAI = async (text, history = []) => {
  try {
    return await post('/ask', { text, history })
  } catch (err) {
    // เซิร์ฟเวอร์ฟรีที่เพิ่งตื่น มักตอบ 502/503 หรือหลุดการเชื่อมต่อในคำขอแรก
    // ลองซ้ำอีกครั้งเงียบ ๆ ดีกว่าให้ผู้ใช้เจอ "เชื่อมต่อไม่ได้" แล้วต้องพูดใหม่ทั้งประโยค
    // (401 คือยังไม่ล็อกอิน ลองซ้ำไปก็ได้ผลเดิม ต้องปล่อยผ่านไปให้แสดงข้อความถูกต้อง)
    const retryable = !err?.status || err.status >= 500
    if (!retryable) throw err
    await new Promise((r) => setTimeout(r, 3000))
    return post('/ask', { text, history })
  }
}

export const changeAdminPassword = (current_password, new_password) =>
  post('/admin/change-password', { current_password, new_password })
export const getAdminUsers = () => get('/admin/users')
export const createAdminUser = (username, password) => post('/admin/users', { username, password })
export const deleteAdminUser = (username) => del(`/admin/users/${encodeURIComponent(username)}`)

// คลังความรู้ (RAG) — เอกสารของฟาร์มที่ AI ค้นมาใช้ตอบ
export const getKnowledge = () => get('/kb')
export const addKnowledgeText = (title, text) => post('/kb', { title, text })
export const deleteKnowledge = (id) => del(`/kb/${id}`)
export const searchKnowledge = (q) => get(`/kb/search?q=${encodeURIComponent(q)}`)
// อัปโหลดไฟล์ต้องส่งเป็น multipart — ห้ามใส่ Content-Type เอง เบราว์เซอร์จะใส่ boundary ให้
export const uploadKnowledge = async (file, title = '') => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('title', title)
  const res = await fetch(apiUrl('/kb/upload'), { method: 'POST', headers: adminHeaders(), body: fd })
  checkAuth(res)
  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json()).detail || '' } catch { /* ไม่ใช่ JSON */ }
    const err = httpError('/kb/upload', res)
    err.detail = detail
    throw err
  }
  return res.json()
}

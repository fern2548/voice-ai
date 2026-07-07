// ฟังก์ชันเรียก API ทั้งหมดรวมไว้ที่เดียว
async function get(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res.json()
}

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
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

// history: อาร์เรย์ของ { role: 'user'|'model', text } ไม่กี่เทิร์นล่าสุด (ประหยัด token)
export const askAI = (text, history = []) => post('/ask', { text, history })

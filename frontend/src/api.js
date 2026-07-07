// ฟังก์ชันเรียก API ทั้งหมดรวมไว้ที่เดียว
export const getWeather = () => fetch('/weather').then((r) => r.json())
export const getHistory = () => fetch('/history').then((r) => r.json())
export const getPredict = () => fetch('/predict').then((r) => r.json())
export const getPredictionsLog = ({ page = 0, pageSize = 100, hours } = {}) => {
  const params = new URLSearchParams({ page, page_size: pageSize })
  if (hours) params.set('hours', hours)
  return fetch(`/predictions-log?${params.toString()}`).then((r) => r.json())
}

export const askAI = (text) =>
  fetch('/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }).then((r) => r.json())

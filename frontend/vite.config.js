import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy เรียก API ไป FastAPI backend ระหว่าง dev (backend รันที่พอร์ต 8000 เสมอ)
const target = 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    // host: true = เปิดให้เครื่องอื่นในวง Wi-Fi เดียวกันเข้าผ่าน IP ได้ ไม่ใช่แค่ localhost
    host: true,
    // ต้องเป็น 5173 เท่านั้น ไม่งั้นพอร์ตเลื่อนแล้วเปิดลิงก์เดิมไม่ได้
    port: 5173,
    strictPort: true,
    proxy: {
      '/health': target,
      '/weather': target,
      '/history': target,
      '/predict': target,
      '/readings-log': target,
      '/predictions-log': target,
      '/pig-health': target,
      '/pig-health-log': target,
      '/vaccine-log': target,
      '/vaccine-history': target,
      '/vaccine-schedule': target,
      '/vaccine-due': target,
      '/admin': target,
      '/export': target,
      '/line': target,
      '/ask': target,
    },
  },
})

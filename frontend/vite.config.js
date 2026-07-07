import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy เรียก API ไป FastAPI backend ระหว่าง dev (backend รันที่พอร์ต 8000 เสมอ)
const target = 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/health': target,
      '/weather': target,
      '/history': target,
      '/predict': target,
      '/readings-log': target,
      '/predictions-log': target,
      '/ask': target,
    },
  },
})

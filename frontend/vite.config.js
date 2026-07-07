import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy เรียก API ไป FastAPI backend (พอร์ต 8000) ระหว่าง dev
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/weather': 'http://localhost:8000',
      '/history': 'http://localhost:8000',
      '/predict': 'http://localhost:8000',
      '/ask': 'http://localhost:8000',
    },
  },
})

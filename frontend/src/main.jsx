import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ThemeProvider } from './theme.jsx'
import { LiveDataProvider } from './context/LiveData.jsx'
import { wakeBackend } from './config.js'
import './styles.css'

wakeBackend()

// ลงทะเบียน service worker เฉพาะตอนใช้จริง (https หรือ localhost) — ตอน dev ไม่ลง กันแคชค้างเวลาแก้โค้ด
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LiveDataProvider>
          <App />
        </LiveDataProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)

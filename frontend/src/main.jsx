import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { ThemeProvider } from './theme.jsx'
import { LiveDataProvider } from './context/LiveData.jsx'
import { OFFLINE, wakeBackend } from './config.js'
import './styles.css'

wakeBackend()

// ลงทะเบียน service worker เฉพาะตอนใช้จริง (https หรือ localhost) — ตอน dev ไม่ลง กันแคชค้างเวลาแก้โค้ด
// เปิดจากไฟล์ตรง ๆ ต้องใช้ HashRouter ไม่งั้นกดเปลี่ยนหน้าแล้วจอขาว
const Router = OFFLINE ? HashRouter : BrowserRouter

if ('serviceWorker' in navigator && !import.meta.env.DEV && !OFFLINE) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <ThemeProvider>
        <LiveDataProvider>
          <App />
        </LiveDataProvider>
      </ThemeProvider>
    </Router>
  </React.StrictMode>
)

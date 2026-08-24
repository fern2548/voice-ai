import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // 5174 เพื่อไม่ชนกับเว็บเดิมที่รันอยู่ 5173 เปิดพร้อมกันได้
    port: 5174,
    // strictPort: ถ้าพอร์ต 5174 ไม่ว่าง ให้ฟ้อง error ไปเลย
    // ค่าปกติของ Vite คือเด้งไปพอร์ตอื่นเงียบ ๆ (5175, 5176...) ทำให้ localhost:5174 เปิดไม่ได้
    // โดยไม่รู้สาเหตุ — เจอปัญหานี้มาแล้ว
    strictPort: true,
    // การเปิดเบราว์เซอร์ให้อัตโนมัติ ทำที่ .vscode/start-dev.ps1 แทน
    // (ไม่ใช้ open:true ตรงนี้ เพราะ VS Code รัน task แบบ NonInteractive แล้วสั่งเปิดไม่ค่อยติด)
    // host: true = ผูกกับทุก network interface ไม่ใช่แค่ localhost
    // ทำให้เปิดจากมือถือหรือเครื่องอื่นในวง Wi-Fi เดียวกันผ่าน IP ได้
    host: true,
  },
})

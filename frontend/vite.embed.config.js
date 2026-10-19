import { defineConfig } from 'vite'

// สร้างไฟล์เดียวจบสำหรับเอาไปฝังในแดชบอร์ดอื่น -> dist/embed/farmy-ask.js
//
// ต้องเป็น iife ไม่ใช่ es module ด้วยสองเหตุผล
//   1. หน้าปลายทางแปะ <script src="..."> ธรรมดาได้เลย ไม่ต้องใส่ type="module"
//   2. โค้ดอ่าน document.currentScript เพื่อดึงค่า data-* ซึ่ง es module อ่านไม่ได้ (เป็น null เสมอ)
//
// emptyOutDir: false เพราะสั่ง build หลักไปก่อนแล้ว ห้ามล้าง dist ทิ้ง
export default defineConfig({
  // ห้ามก๊อป public/ ซ้ำ รอบ build หลักทำไปแล้ว
  // ไม่ปิดจะได้ dist/embed/ ที่มีรูปทั้งเว็บซ้อนอยู่ข้างในอีกชุด
  publicDir: false,
  build: {
    outDir: 'dist/embed',
    emptyOutDir: false,
    lib: {
      entry: 'embed/farmy-ask.js',
      name: 'FarmyAsk',
      formats: ['iife'],
      fileName: () => 'farmy-ask.js',
    },
    // ฝังในหน้าคนอื่น จะไปแปะไฟล์ css แยกให้เขาโหลดเองไม่ได้
    cssCodeSplit: false,
  },
})

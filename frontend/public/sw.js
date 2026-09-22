// Service worker ของ Farmy Voice — ทำให้ติดตั้งเป็นแอปได้ และเปิดหน้าเว็บได้แม้เน็ตสะดุด
//
// กติกา (เรียบง่าย ปลอดภัยกับข้อมูลสด):
//   - ไฟล์หน้าเว็บ (/assets/ ที่มี hash, ไอคอน, ภาพคู่มือ)  → เก็บแคช ใช้จากแคชก่อน (ไม่เปลี่ยนจนกว่าจะ build ใหม่)
//   - หน้า HTML                                          → ขอจากเน็ตก่อน ไม่ได้ค่อยใช้ index.html ที่แคชไว้
//   - API ทุกตัว (/ask, /weather, /vaccine-… ฯลฯ)         → ไม่แคชเลย ข้อมูลต้องสดเสมอ
const VERSION = 'farmy-v1'
const SHELL = ['/', '/overview', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']
const STATIC_PREFIX = ['/assets/', '/icons/', '/guide/', '/vaccines/']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL).catch(() => {})))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  // ลบแคชรุ่นเก่าทิ้ง ไม่ให้กินที่
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return          // ของนอกโดเมน (ฟอนต์ ไอคอน CDN) ปล่อยเบราว์เซอร์จัดการ

  if (STATIC_PREFIX.some((p) => url.pathname.startsWith(p))) {
    // ไฟล์นิ่ง: แคชก่อน
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()))
      return res
    })))
    return
  }

  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    // หน้าเว็บ: เน็ตก่อน ล้มค่อยใช้ที่แคช (offline ยังเปิดโครงหน้าได้ แต่ข้อมูลจะบอกว่าต่อไม่ได้)
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) caches.open(VERSION).then((c) => c.put('/', res.clone()))
      return res
    }).catch(() => caches.match('/')))
  }
  // อื่น ๆ (API) ไม่แตะ
})

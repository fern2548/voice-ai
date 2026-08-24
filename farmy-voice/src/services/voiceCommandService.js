// แปลงคำสั่งเสียงเป็นเส้นทางในเว็บ รองรับทั้งคำไทยและอังกฤษ
// รายการเรียงจากเจาะจงไปกว้าง เพราะ "หมูป่วย" ต้องชนะ "หมู" เฉย ๆ

export const commandRoutes = [
  { keywords: ['หมูป่วย', 'สุกรป่วย', 'ป่วย', 'sick pig', 'sick', 'health'], path: '/health', label: 'สุขภาพสุกร' },
  { keywords: ['โรงเรือน', 'คอก', 'barn', 'go barn'], path: '/barns', label: 'โรงเรือน' },
  { keywords: ['วัคซีน', 'ฉีดยา', 'vaccine'], path: '/vaccines', label: 'วัคซีน' },
  { keywords: ['รายงาน', 'สรุป', 'report'], path: '/reports', label: 'รายงาน' },
  { keywords: ['อากาศ', 'ฝน', 'พยากรณ์', 'weather'], path: '/weather', label: 'พยากรณ์อากาศ' },
  { keywords: ['แจ้งเตือน', 'เตือน', 'alert', 'notification'], path: '/reports', label: 'การแจ้งเตือน' },
  { keywords: ['ตั้งค่า', 'setting'], path: '/settings', label: 'ตั้งค่า' },
  { keywords: ['หน้าแรก', 'กลับหน้าหลัก', 'home'], path: '/', label: 'หน้าแรก' },
]

// คำที่บ่งบอกว่าผู้ใช้ "สั่งให้พาไป" ไม่ใช่ "ถามข้อมูล"
const navigationVerbs = ['ไปหน้า', 'ไปที่', 'เปิดหน้า', 'เปิด', 'พาไป', 'ไป', 'go to', 'go ', 'open ']

/**
 * ตีความคำสั่งเสียง
 * @param {string} command ข้อความที่ได้จากเสียงหรือช่องพิมพ์
 * @returns {{type: 'navigate', path: string, label: string} | {type: 'question'}}
 */
export function handleVoiceCommand(command) {
  const text = String(command || '').toLowerCase().trim()
  if (!text) return { type: 'question' }

  const wantsNavigation = navigationVerbs.some((v) => text.includes(v))
  const hit = commandRoutes.find((r) => r.keywords.some((k) => text.includes(k)))

  // ต้องมีทั้งคำกริยาสั่งพาไป และปลายทางที่รู้จัก ถึงจะถือว่าเป็นคำสั่งนำทาง
  // ไม่งั้น "โรงเรือน 3 มีหมูป่วยกี่ตัว" จะโดนพาออกจากหน้าแทนที่จะตอบคำถาม
  if (wantsNavigation && hit) {
    return { type: 'navigate', path: hit.path, label: hit.label }
  }
  return { type: 'question' }
}

/**
 * เลือกว่าคำถามนี้ควรให้ Local AI หรือ Gemini ตอบ
 * ข้อมูลตัวเลขในฟาร์ม -> local, ความรู้ทั่วไป -> gemini
 * @param {string} question
 * @returns {'local' | 'gemini'}
 */
export function routeQuestion(question) {
  const text = String(question || '').toLowerCase()
  const farmSignals = ['โรงเรือน', 'กี่ตัว', 'จำนวน', 'อุณหภูมิ', 'ความชื้น', 'แสง', 'ป่วย', 'แจ้งเตือน', 'ล่าสุด']
  const knowledgeSignals = ['คืออะไร', 'อย่างไร', 'ยังไง', 'ทำไม', 'ป้องกัน', 'วิธี', 'แนะนำ', 'ควร']

  const knowledgeHit = knowledgeSignals.some((k) => text.includes(k))
  const farmHit = farmSignals.some((k) => text.includes(k))

  // ถามเชิง "คืออะไร/ป้องกันยังไง" ให้ Gemini แม้จะมีคำในฟาร์มปนอยู่
  if (knowledgeHit && !farmHit) return 'gemini'
  if (knowledgeHit && farmHit) return 'gemini'
  return farmHit ? 'local' : 'gemini'
}

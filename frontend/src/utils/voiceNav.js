// สั่งเปิดหน้าด้วยเสียง — จับคำในประโยคแล้วพาไปหน้านั้นทันที ไม่ต้องส่งให้ AI
//
// ทำในเบราว์เซอร์ทั้งหมด เพราะ:
//   - เปิดหน้าได้ทันทีในเสี้ยววินาที ไม่ต้องรอเซิร์ฟเวอร์ตอบ
//   - เป็นคำสั่งตายตัว ไม่ต้องให้ AI ตีความ (กันเปิดผิดหน้า)
//
// กฎ: ต้องมี "คำสั่งเปิด" + "ชื่อหน้า" ในประโยคเดียวกัน
// ถ้าพูดแค่ "อุณหภูมิเท่าไหร่" ไม่มีคำสั่งเปิด = เป็นคำถาม ส่งให้ AI ตามปกติ

// คำที่บอกว่าอยากไปหน้าอื่น
const NAV_VERBS = [
  'เปิดหน้า', 'ไปหน้า', 'ไปที่หน้า', 'เข้าหน้า', 'ดูหน้า', 'แสดงหน้า', 'ขอดูหน้า', 'พาไปหน้า',
  'เปิด', 'ไปที่', 'ไปดู', 'พาไป', 'เข้าไป', 'สลับไป', 'เปลี่ยนไป', 'กลับ', 'แสดง', 'ขอดู', 'ดู',
]

// คำที่บ่งชี้หน้าแบบชัดเจน — เจอแล้วแค่มี "ดู" นำหน้าก็พอ
// เช่น "ดูกราฟ" ไม่มีทางเป็นคำถามเรื่องข้อมูล มันคือขอเปิดกราฟ
const PAGES = [
  {
    path: '/history',
    label: 'กราฟข้อมูลย้อนหลัง',
    strong: ['กราฟ', 'หน้ารายงาน', 'ข้อมูลย้อนหลัง', 'ข้อมูลดิบ'],
    weak: ['รายงาน', 'ย้อนหลัง', 'ประวัติอากาศ'],
  },
  {
    path: '/forecast',
    label: 'พยากรณ์อากาศ',
    strong: ['หน้าพยากรณ์', 'ตารางพยากรณ์'],
    weak: ['พยากรณ์', 'ล่วงหน้า'],
  },
  {
    path: '/trend',
    label: 'เทียบแนวโน้ม',
    strong: ['หน้าเทียบ', 'เทียบแนวโน้ม', 'เทียบค่าทำนาย'],
    weak: ['แนวโน้ม', 'เทียบ'],
  },
  {
    path: '/vaccine',
    label: 'วัคซีน',
    strong: ['หน้าวัคซีน', 'ตารางวัคซีน', 'ประวัติวัคซีน'],
    weak: ['วัคซีน', 'ฉีดยา'],
  },
  {
    path: '/pig-log',
    label: 'โรงเรือน',
    strong: ['หน้าโรงเรือน', 'หน้าหมูป่วย', 'บันทึกหมูป่วย'],
    weak: ['โรงเรือน', 'หมูป่วย', 'สุขภาพหมู'],
  },
  {
    path: '/settings',
    label: 'ตั้งค่า',
    strong: ['ตั้งค่า', 'การตั้งค่า', 'เปลี่ยนรหัส'],
    weak: [],
  },
  {
    path: '/features',
    label: 'ทำอะไรได้บ้าง',
    strong: ['ทำอะไรได้บ้าง', 'ความสามารถ', 'หน้าแนะนำ'],
    weak: [],
  },
  {
    path: '/overview',
    label: 'หน้าแรก',
    strong: ['หน้าแรก', 'หน้าหลัก', 'หน้าเมน'],
    weak: [],
  },
]

// คำสั่งที่ต้องชัดเจนพอจะใช้กับคำแบบ weak ได้
// ("ดู" อย่างเดียวไม่พอ เพราะ "ดูวัคซีนล่าสุด" อาจเป็นคำถาม)
const STRONG_VERBS = [
  'เปิดหน้า', 'ไปหน้า', 'ไปที่หน้า', 'เข้าหน้า', 'พาไปหน้า',
  'เปิด', 'ไปที่', 'พาไป', 'เข้าไป', 'สลับไป', 'เปลี่ยนไป', 'กลับ',
]

// ค่าที่อยากดูในกราฟ — ส่งต่อให้หน้ากราฟเลือกให้เลย
const METRICS = [
  { key: 'temperature', words: ['อุณหภูมิ', 'ร้อน', 'หนาว'] },
  { key: 'humidity', words: ['ความชื้น', 'ชื้น'] },
  { key: 'windspeed', words: ['ลม', 'ความเร็วลม'] },
  { key: 'rainfall', words: ['ฝน', 'ปริมาณฝน'] },
  { key: 'light', words: ['แสง', 'ความสว่าง', 'ความเข้มแสง'] },
]

/**
 * ตรวจว่าประโยคเป็นคำสั่งเปิดหน้าไหม
 * คืน { path, label, metric? } ถ้าใช่ · null ถ้าเป็นคำถามธรรมดา
 */
export function parseNavCommand(text) {
  const t = (text || '').replace(/\s+/g, '')
  if (!t) return null

  const hasVerb = NAV_VERBS.some((v) => t.includes(v))
  const hasStrongVerb = STRONG_VERBS.some((v) => t.includes(v))
  if (!hasVerb) return null

  for (const page of PAGES) {
    const strongHit = page.strong.some((w) => t.includes(w))
    const weakHit = page.weak.some((w) => t.includes(w))
    if (strongHit || (weakHit && hasStrongVerb)) {
      const result = { path: page.path, label: page.label }
      if (page.path === '/history') {
        const m = METRICS.find((x) => x.words.some((w) => t.includes(w)))
        if (m) result.metric = m.key
      }
      return result
    }
  }
  return null
}

// ประโยคที่ระบบจะพูดตอบหลังเปิดหน้าให้
export function navReply(nav) {
  const metricLabel = {
    temperature: 'อุณหภูมิ', humidity: 'ความชื้น', windspeed: 'ความเร็วลม',
    rainfall: 'ปริมาณฝน', light: 'ความเข้มแสง',
  }[nav.metric]
  if (nav.path === '/history' && metricLabel) {
    return `เปิดกราฟ${metricLabel}ให้แล้วครับ`
  }
  return `เปิดหน้า${nav.label}ให้แล้วครับ`
}

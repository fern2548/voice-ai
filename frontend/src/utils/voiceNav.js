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
    // เซนเซอร์ภายนอก — ต้องมาก่อน /history เพราะ "กราฟเล้า R" มีคำว่ากราฟเหมือนกัน
    // แต่ต้องไปหน้านี้ ไม่ใช่กราฟฟาร์มเรา (ดูลำดับตรวจใน parseNavCommand)
    path: '/sensors',
    label: 'กราฟข้อมูล',
    strong: ['กราฟข้อมูล', 'หน้ากราฟข้อมูล', 'เซนเซอร์ภายนอก', 'หน้าเซนเซอร์', 'เล้าอาร์', 'เล้า r', 'เล้าr', 'กำแพงเพชร', 'แสลงพัน', 'แปลงดิน', 'ความชื้นดิน'],
    weak: ['เซนเซอร์', 'ดิน', 'เล้า'],
  },
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
  const t = (text || '').replace(/\s+/g, '').toLowerCase()
  if (!t) return null

  const hasVerb = NAV_VERBS.some((v) => t.includes(v))
  const hasStrongVerb = STRONG_VERBS.some((v) => t.includes(v))
  if (!hasVerb) return null

  for (const page of PAGES) {
    const strongHit = page.strong.some((w) => t.includes(w))
    const weakHit = page.weak.some((w) => t.includes(w))
    if (strongHit || (weakHit && hasStrongVerb)) {
      const result = { path: page.path, label: page.label }
      if (page.path === '/sensors') {
        // เดาชุดข้อมูลกับค่าที่อยากดู เพื่อพามาถึงพร้อมตั้งค่าเสร็จ
        if (/ดิน|แปลง/.test(t)) result.source = 'soil'
        else if (/กำแพงเพชร|เล้า/.test(t)) result.source = 'pig'
        else if (/แสลงพัน|เสาอากาศ/.test(t)) result.source = 'weather'
        else result.source = 'pig'
        if (/แอมโมเนีย|nh3/.test(t)) result.measure = 'nh3'
        else if (/คาร์บอน|co2/.test(t)) result.measure = 'co2'
        else if (/ไหลอากาศ|พัดลม/.test(t)) result.measure = 'airflow'
        else if (/kwh|พลังงาน|กี่หน่วย/.test(t)) result.measure = 'energy_kwh'
        else if (/กำลังไฟ|ไฟฟ้า|ค่าไฟ|ใช้ไฟ/.test(t)) result.measure = 'power_kw'
        else if (/ความชื้นดิน|ชื้นดิน/.test(t)) result.measure = 'soil_moisture'
        else if (/อุณหภูมิดิน/.test(t)) result.measure = 'soil_temperature'
        else if (/ทิศทางลม|ทิศลม/.test(t)) result.measure = 'wind_direction'
        else if (/ลม/.test(t)) result.measure = 'wind_speed'
        else if (/ฝนสะสม/.test(t)) result.measure = result.source === 'weather' ? 'rainfall_24hr' : 'rainfall_24h'
        else if (/ฝน/.test(t)) result.measure = 'rainfall'
        else if (/ความเข้มแสง/.test(t)) result.measure = 'enegy_intensity'
        else if (/แสง|สว่าง/.test(t)) result.measure = 'light'
        else if (/ชื้น/.test(t)) result.measure = 'humidity'
        else if (/อุณหภูมิ|ร้อน/.test(t)) result.measure = 'temperature'
        // เจาะจงจุดติดตั้ง
        if (/จุดที่1|จุด1|จุดแรก/.test(t)) result.location = 'slangpun_soil_node1'
        else if (/จุดที่2|จุด2|จุดสอง/.test(t)) result.location = 'slangpun_soil_node2'
        else if (/เสาอากาศกำแพงเพชร|ออฟฟิศ/.test(t)) result.location = 'kamphaengphet_office'
        else if (/เล้าr|เล้าอาร์|ในเล้า/.test(t)) result.location = 'barn_R'
        if (/สัปดาห์|7 ?วัน|อาทิตย์/.test(t)) result.hours = 168
        else if (/3 ?วัน/.test(t)) result.hours = 72
        else if (/6 ?ชั่วโมง|6 ?ชม/.test(t)) result.hours = 6
      }
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
  if (nav.path === '/sensors') {
    const where = { soil: 'ดินแสลงพัน', pig: 'เล้าหมูกำแพงเพชร', weather: 'เสาอากาศแสลงพัน' }[nav.source] || 'กราฟข้อมูล'
    return `เปิดกราฟ${where}ให้แล้วครับ`
  }
  return `เปิดหน้า${nav.label}ให้แล้วครับ`
}

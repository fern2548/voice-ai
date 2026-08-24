// Local AI — ตอบคำถามเกี่ยวกับ "ข้อมูลภายในฟาร์ม" จาก mock JSON
// โครงสร้างตั้งใจให้เปลี่ยนไปเรียก API จริงได้โดยไม่ต้องแก้ฝั่ง UI:
// แค่เปลี่ยนไส้ในของ askLocalAI ให้ await fetch(...) แล้วคืน { source, answer } เหมือนเดิม

import { farmData, healthCases, vaccineRecords } from '../data/mockFarmData.js'

export const SOURCE = 'local'

// หาเลขโรงเรือนจากประโยค เช่น "โรงเรือน 3 มีหมูป่วยกี่ตัว" -> 3
function findBarnId(text) {
  const m = text.match(/โรงเรือน\s*(\d+)/) || text.match(/barn\s*(\d+)/i)
  return m ? Number(m[1]) : null
}

const has = (text, words) => words.some((w) => text.includes(w))

// ตัวจับคู่คำถาม -> คำตอบ เรียงจากเจาะจงที่สุดไปกว้างที่สุด
const matchers = [
  {
    test: (t) => has(t, ['ป่วย', 'ไม่สบาย', 'sick']),
    run: (t) => {
      const id = findBarnId(t)
      if (id) {
        const c = healthCases.find((x) => x.barn === `โรงเรือน ${id}`)
        return c
          ? `โรงเรือน ${id} มีสุกรป่วย ${c.count} ตัว อาการ: ${c.symptom} สถานะ: ${c.status}`
          : `โรงเรือน ${id} ไม่มีรายงานสุกรป่วยในวันนี้`
      }
      const detail = healthCases.map((c) => `${c.barn} ${c.count} ตัว`).join(' · ')
      return `วันนี้มีสุกรป่วยรวม ${farmData.sickToday} ตัว แยกเป็น ${detail}`
    },
  },
  {
    test: (t) => has(t, ['อุณหภูมิ', 'ร้อน', 'temp']),
    run: (t) => {
      const id = findBarnId(t)
      const barn = id ? farmData.barns.find((b) => b.id === id) : null
      if (barn) return `${barn.name} อุณหภูมิ ${barn.temperature}°C ความชื้น ${barn.humidity}%`
      const all = farmData.barns.map((b) => `${b.name} ${b.temperature}°C`).join(' · ')
      return `อุณหภูมิแต่ละโรงเรือนตอนนี้: ${all}`
    },
  },
  {
    test: (t) => has(t, ['ความชื้น', 'ชื้น', 'humid']),
    run: (t) => {
      const id = findBarnId(t)
      const barn = id ? farmData.barns.find((b) => b.id === id) : null
      if (barn) return `${barn.name} ความชื้น ${barn.humidity}%`
      const all = farmData.barns.map((b) => `${b.name} ${b.humidity}%`).join(' · ')
      return `ความชื้นแต่ละโรงเรือนตอนนี้: ${all}`
    },
  },
  {
    test: (t) => has(t, ['แสง', 'light']),
    run: () => {
      const all = farmData.barns.map((b) => `${b.name} ${b.light}%`).join(' · ')
      return `ระดับแสงแต่ละโรงเรือน: ${all}`
    },
  },
  {
    test: (t) => has(t, ['วัคซีน', 'ฉีด', 'vaccine']),
    run: () => {
      const last = vaccineRecords[0]
      return `วัคซีนล่าสุดคือ ${last.vaccine} ฉีดที่ ${last.barn} เมื่อ ${last.date} จำนวน ${last.pigs} ตัว นัดครั้งถัดไป ${last.nextDue}`
    },
  },
  {
    test: (t) => has(t, ['แจ้งเตือน', 'เตือน', 'alert']),
    run: () => `ตอนนี้มีการแจ้งเตือนค้างอยู่ ${farmData.alerts} รายการ`,
  },
  {
    test: (t) => has(t, ['กี่ตัว', 'จำนวน', 'ทั้งหมด', 'total']),
    run: () => `ฟาร์มมีสุกรทั้งหมด ${farmData.pigs.toLocaleString('th-TH')} ตัว`,
  },
]

/**
 * ถาม Local AI
 * @param {string} question คำถามจากผู้ใช้
 * @returns {Promise<{source: string, answer: string}>}
 */
export async function askLocalAI(question) {
  const text = String(question || '').toLowerCase()
  const hit = matchers.find((m) => m.test(text))

  // หน่วงสั้น ๆ ให้ UI ได้แสดงสถานะ "กำลังประมวลผล" เหมือนเรียก API จริง
  await new Promise((r) => setTimeout(r, 600))

  return {
    source: SOURCE,
    answer: hit
      ? hit.run(text)
      : `ยังไม่พบข้อมูลนี้ในฟาร์ม ลองถามเรื่องจำนวนสุกร สุกรป่วย อุณหภูมิ ความชื้น แสง หรือวัคซีนดูนะคะ`,
  }
}

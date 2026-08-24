// Gemini AI — ตอบคำถาม "ความรู้ภายนอกฟาร์ม" (โรคสุกร การจัดการ biosecurity)
//
// ตอนนี้เป็น mock answer แต่วางโครงไว้ให้สลับเป็น Gemini API จริงได้ทันที
// วิธีเปลี่ยนเป็นของจริง: ใส่ VITE_GEMINI_API_KEY ใน .env แล้วปลดคอมเมนต์ callGeminiAPI
// ฝั่ง UI ไม่ต้องแก้อะไรเลย เพราะยังคืนรูปแบบ { source, answer } เหมือนเดิม

export const SOURCE = 'gemini'

const knowledge = [
  {
    keys: ['prrs'],
    answer:
      'PRRS (Porcine Reproductive and Respiratory Syndrome) เป็นโรคไวรัสที่ทำให้แม่สุกรแท้ง คลอดก่อนกำหนด และลูกสุกรมีปัญหาระบบหายใจ ควบคุมด้วยการจัดการฝูงแบบ all-in/all-out ร่วมกับโปรแกรมวัคซีนและการคุมสุกรเข้าใหม่',
  },
  {
    keys: ['asf', 'อหิวาต์แอฟริกา'],
    answer:
      'ASF (African Swine Fever) ยังไม่มีวัคซีนที่ใช้ได้ทั่วไป การป้องกันจึงพึ่ง biosecurity เป็นหลัก ได้แก่ คุมคนและยานพาหนะเข้าออก ห้ามใช้เศษอาหารเลี้ยงสุกร กักสุกรใหม่ก่อนเข้าฝูง และฆ่าเชื้ออุปกรณ์ทุกครั้ง',
  },
  {
    keys: ['biosecurity', 'ไบโอซีเคียว', 'ความปลอดภัยทางชีวภาพ'],
    answer:
      'Biosecurity ที่ดีมี 3 ชั้น: กันเชื้อเข้าฟาร์ม (คัดกรองคน รถ สุกรใหม่), กันเชื้อแพร่ในฟาร์ม (แยกโซน เปลี่ยนชุดรองเท้า ล้างมือ) และกันเชื้อออกนอกฟาร์ม (จัดการซากและมูลอย่างถูกวิธี)',
  },
  {
    keys: ['ปากเท้าเปื่อย', 'fmd'],
    answer:
      'โรคปากเท้าเปื่อย (FMD) ติดต่อเร็วมากทางอากาศและการสัมผัส อาการเด่นคือแผลพองที่ปาก จมูก และไรกีบ ทำให้สุกรเจ็บจนไม่กินอาหาร ป้องกันด้วยการฉีดวัคซีนซ้ำตามกำหนดและคุมการเคลื่อนย้ายสัตว์',
  },
  {
    keys: ['อาหาร', 'ให้อาหาร', 'feed'],
    answer:
      'การจัดการอาหารควรแบ่งสูตรตามช่วงอายุ ให้น้ำสะอาดตลอดเวลา และเก็บอาหารในที่แห้งเพื่อเลี่ยงเชื้อรา สารพิษจากเชื้อราเป็นสาเหตุที่พบบ่อยของการโตช้าและภูมิคุ้มกันตก',
  },
  {
    keys: ['ความร้อน', 'heat stress', 'อากาศร้อน'],
    answer:
      'ภาวะเครียดจากความร้อนทำให้สุกรกินอาหารลดลงและโตช้า ควรคุมอุณหภูมิโรงเรือนไม่ให้เกิน 30°C ใช้ระบบระเหยน้ำหรือพัดลมดูดอากาศ และเลี่ยงการเคลื่อนย้ายสุกรช่วงกลางวัน',
  },
]

/**
 * ถาม Gemini AI
 * @param {string} question คำถามจากผู้ใช้
 * @returns {Promise<{source: string, answer: string}>}
 */
export async function askGemini(question) {
  const text = String(question || '').toLowerCase()
  const hit = knowledge.find((k) => k.keys.some((key) => text.includes(key)))

  await new Promise((r) => setTimeout(r, 900))

  return {
    source: SOURCE,
    answer: hit
      ? hit.answer
      : 'คำถามนี้เป็นความรู้ภายนอกฟาร์ม เมื่อเชื่อมต่อ Gemini API แล้วระบบจะตอบให้ได้ครบถ้วนขึ้น ตอนนี้ลองถามเรื่อง PRRS, ASF, FMD, biosecurity หรือการจัดการอาหารดูนะคะ',
  }
}

/*
// ---- ตัวอย่างการต่อ Gemini API จริง ----
// แทนที่ไส้ในของ askGemini ด้านบนด้วยฟังก์ชันนี้ได้เลย
export async function callGeminiAPI(question) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: question }] }] }),
    }
  )
  const data = await res.json()
  return {
    source: SOURCE,
    answer: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'ไม่สามารถตอบได้ในขณะนี้',
  }
}
*/

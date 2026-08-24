// ช่วยให้ speech-to-text (Web Speech API) "ฟังรู้เรื่อง" มากขึ้น
// แนวคิด: ให้เบราว์เซอร์คืนคำที่เป็นไปได้หลายแบบ (alternatives) แล้วเลือกแบบที่ตรงกับ
// คำศัพท์ที่ระบบรู้จัก (สภาพอากาศ/หมู) มากที่สุด แทนที่จะเชื่อแค่อันดับ 1 เสมอ
// ซึ่งบ่อยครั้งเป็นคำที่ใกล้เคียงแต่ไม่ตรงกับสิ่งที่ผู้ใช้ถามจริง ๆ

const DOMAIN_KEYWORDS = [
  'อุณหภูมิ', 'ร้อน', 'หนาว', 'ความชื้น', 'ชื้น', 'ลม', 'ความเร็วลม',
  'ฝน', 'ฝนตก', 'แสง', 'สว่าง', 'พยากรณ์', 'ทำนาย', 'แนวโน้ม',
  'ย้อนหลัง', 'เฉลี่ย', 'สูงสุด', 'ต่ำสุด', 'สถิติ', 'วันนี้', 'พรุ่งนี้', 'เมื่อวาน',
  'สภาพอากาศ', 'ฟาร์ม', 'หมู', 'ป่วย', 'สุขภาพ', 'จำนวน', 'ตัว',
  // สายพันธุ์หมู
  'สายพันธุ์', 'พันธุ์', 'พันธุ์หมู', 'ไหหลำ', 'ควาย', 'ราด', 'พวง',
  'แลนด์เรซ', 'ลาร์จไวต์', 'ดูร็อก', 'ลูกผสม', 'พื้นเมือง', 'ต่างประเทศ',
  // วัคซีน/บันทึกการฉีดยา
  'วัคซีน', 'ฉีดยา', 'ฉีดวัคซีน', 'บันทึก', 'จด', 'ปากเท้าเปื่อย', 'อหิวาต์',
]

function score(text) {
  return DOMAIN_KEYWORDS.reduce((n, k) => (text.includes(k) ? n + 1 : n), 0)
}

// เลือก transcript ที่ดีที่สุดจากรายการ alternatives ของ "หนึ่งท่อนคำพูด" (SpeechRecognitionResult เดียว)
// ผลลัพธ์ที่มีคำศัพท์โดเมนตรงมากกว่า จะถูกเลือกแทนอันดับ 1 เดิม (ถ้าคะแนนสูงกว่าจริง)
function pickBestAlternative(result) {
  let best = result[0].transcript
  let bestScore = score(best)
  for (let i = 1; i < result.length; i++) {
    const alt = result[i].transcript
    const s = score(alt)
    if (s > bestScore) {
      best = alt
      bestScore = s
    }
  }
  return best
}

// ประกอบข้อความเต็มจาก "ทุกท่อน" ที่พูดมา ไม่ใช่แค่ท่อนล่าสุด
// เวลาพูดประโยคยาวแล้วมีจังหวะเว้นวรรค เบราว์เซอร์จะตัดเป็นหลายท่อน (results[0], results[1], ...)
// ถ้าอ่านแค่ท่อนสุดท้ายจะได้ข้อความไม่ครบประโยค ต้องต่อทุกท่อนเข้าด้วยกันตามลำดับเสมอ
export function pickBestTranscript(results) {
  let text = ''
  for (let i = 0; i < results.length; i++) {
    text += pickBestAlternative(results[i])
  }
  return text
}

// ตั้งค่า SpeechRecognition ให้เหมาะกับการฟังภาษาไทยเรื่องสภาพอากาศ/ฟาร์ม
// maxAlternatives สูงขึ้น -> มีตัวเลือกให้ pickBestTranscript คัดมากขึ้น
// continuous -> ฟังต่อเนื่องข้ามจังหวะเว้นวรรคในประโยคเดียวกัน ไม่ตัดกลางประโยคตอนหยุดหายใจสั้น ๆ
export function createRecognizer() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return null
  const r = new SR()
  r.lang = 'th-TH'
  r.interimResults = true
  r.maxAlternatives = 5
  r.continuous = true
  return r
}

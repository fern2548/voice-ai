// แปลงคำตอบของ AI ที่มี Markdown ปนมา ให้เอาไปแสดงผลและอ่านออกเสียงได้
//
// AI บางตัว (โดยเฉพาะของ CPF) ตอบมาเป็น Markdown เต็มรูปแบบ
//   **ตัวหนา** · ### หัวข้อ · 1. ข้อ · - จุด · [ชื่อ](ลิงก์)
// ถ้าเอาไปแสดงดิบ ๆ จะเห็นเป็นดอกจันกับชาร์ปเต็มไปหมด อ่านไม่รู้เรื่อง
// และถ้าเอาไปให้เสียงอ่าน มันจะอ่านว่า "ดอกจันดอกจัน" ด้วย
//
// ไม่ใช้ไลบรารี Markdown เพราะต้องการแค่ไม่กี่แบบ และไม่อยากให้ไฟล์เว็บใหญ่ขึ้นอีก

/** ตัดสัญลักษณ์ Markdown ออกให้เหลือแต่ข้อความ — ใช้ตอนส่งให้เสียงอ่าน */
export function stripMarkdown(text) {
  return (text || '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')   // [ชื่อ](ลิงก์) -> ชื่อ
    .replace(/https?:\/\/\S+/g, '')            // ลิงก์โดด ๆ อ่านออกเสียงไม่รู้เรื่อง
    .replace(/[*_`#>]/g, '')                   // สัญลักษณ์จัดรูปแบบ
    .replace(/^\s*[-•]\s+/gm, '')              // จุดนำหน้าข้อ
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/** คำตอบนี้มีโครงสร้าง (หัวข้อ/รายการ) ไหม — ถ้ามีควรชิดซ้ายแทนจัดกึ่งกลาง */
export function isStructured(text) {
  const t = text || ''
  return /^\s*(\d+\.|[-•]|#{1,4}\s)/m.test(t) || /\*\*/.test(t)
}

/** ตัดข้อความเป็นชิ้น ๆ เพื่อทำตัวหนากับลิงก์ */
function inline(text) {
  const parts = []
  // จับทั้ง **ตัวหนา** และ [ชื่อ](ลิงก์) ในรอบเดียว จะได้ไม่ต้องไล่ซ้อนกันหลายชั้น
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: 'text', v: text.slice(last, m.index) })
    if (m[1] !== undefined) parts.push({ t: 'bold', v: m[1] })
    else parts.push({ t: 'link', v: m[2], href: m[3] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ t: 'text', v: text.slice(last) })
  return parts.length ? parts : [{ t: 'text', v: text }]
}

/**
 * แปลงคำตอบเป็นบล็อกสำหรับแสดงผล
 * คืน [{ kind: 'head'|'para'|'ul'|'ol', ... }]
 */
export function parseAnswer(text) {
  const lines = (text || '').replace(/\r/g, '').split('\n')
  const blocks = []
  let para = []
  let list = null   // { kind: 'ul'|'ol', items: [] }

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: 'para', parts: inline(para.join(' ').trim()) })
      para = []
    }
  }
  const flushList = () => {
    if (list) { blocks.push(list); list = null }
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { flushPara(); flushList(); continue }

    const head = line.match(/^#{1,4}\s+(.*)$/)
    if (head) {
      flushPara(); flushList()
      blocks.push({ kind: 'head', parts: inline(head[1].replace(/[:：]\s*$/, '')) })
      continue
    }

    const ol = line.match(/^(\d+)[.)]\s+(.*)$/)
    if (ol) {
      flushPara()
      if (!list || list.kind !== 'ol') { flushList(); list = { kind: 'ol', items: [] } }
      list.items.push(inline(ol[2]))
      continue
    }

    const ul = line.match(/^[-•*]\s+(.*)$/)
    if (ul) {
      flushPara()
      if (!list || list.kind !== 'ul') { flushList(); list = { kind: 'ul', items: [] } }
      list.items.push(inline(ul[1]))
      continue
    }

    // บรรทัดธรรมดาที่ต่อจากรายการ ให้ถือว่าเป็นคำอธิบายของข้อล่าสุด ไม่ขึ้นย่อหน้าใหม่
    if (list && list.items.length) {
      const lastItem = list.items[list.items.length - 1]
      lastItem.push({ t: 'text', v: ' ' + line })
      continue
    }
    para.push(line)
  }
  flushPara()
  flushList()
  return blocks
}

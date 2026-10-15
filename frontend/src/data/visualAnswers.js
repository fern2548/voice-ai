// จับว่าคำถามนี้ "มีรูปที่เราทำไว้แล้ว" หรือเปล่า — ถ้ามี ให้ขึ้นรูปต่อท้ายคำตอบ
//
// หน้า Voice AI เป็นหน้าหลักที่ผู้ใช้ถาม แต่รูปดี ๆ ที่ทำไว้กลับอยู่แต่ในหน้าอื่น
// ผู้ใช้ไม่รู้ว่ามี เลยไม่ได้เปิดดู ตัวนี้เลยดึงรูปมาให้เห็นตรงที่ถามเลย
//
// อาการโรคมีกลไกของตัวเองอยู่แล้ว (symptomIndex.js) ไฟล์นี้ดูแลที่เหลือ
//   - วิธี/ตำแหน่งฉีดวัคซีน
//   - สายพันธุ์สุกร

import { GUIDES } from './vaccineGuide.js'
import { BREEDS } from './breeding.js'

const norm = (s) => (s || '').replace(/\s+/g, '').toLowerCase()

// ---------- วิธีฉีดวัคซีน ----------
const VACCINE_WORDS = [
  'ฉีดตรงไหน', 'ฉีดที่ไหน', 'ตำแหน่งฉีด', 'จุดฉีด', 'วิธีฉีด', 'ฉีดยังไง', 'ฉีดอย่างไร',
  'แทงเข็ม', 'เข้ากล้าม', 'ใต้ผิวหนัง', 'คู่มือฉีด',
]

function matchVaccine(t) {
  const hit = VACCINE_WORDS.some((w) => t.includes(w))
    || (t.includes('ฉีด') && (t.includes('วัคซีน') || t.includes('หมู') || t.includes('สุกร'))
        && (t.includes('ไหน') || t.includes('ยังไง') || t.includes('อย่างไร') || t.includes('วิธี')))
  if (!hit) return null
  return {
    kind: 'vaccine',
    title: 'ตำแหน่งฉีดที่ถูกต้อง',
    note: 'โดสและขนาดเข็มให้ยึดตามฉลากวัคซีนหรือคำสั่งสัตวแพทย์',
    to: '/vaccine-guide',
    toLabel: 'ดูคู่มือเต็ม',
    items: GUIDES.map((g) => ({
      img: g.img,
      title: g.who,
      tag: g.routeLabel,
      lines: [g.spot, g.how],
    })),
  }
}

// ---------- สายพันธุ์สุกร ----------
const BREED_WORDS = ['สายพันธุ์', 'พันธุ์หมู', 'หมูพันธุ์', 'พันธุ์สุกร', 'สุกรพันธุ์']

// ชื่อเรียกสั้นที่คนใช้จริง — ในข้อมูลเก็บชื่อเต็ม ("ดูร็อคเจอร์ซี่")
// แต่คนเลี้ยงเรียกสั้น ("ดูร็อค") ถ้าเทียบเฉพาะชื่อเต็มจะจับไม่ได้
const BREED_ALIAS = {
  largewhite: ['ลาร์จไวท์', 'ลาร์จไวต์', 'largewhite', 'large white'],
  landrace: ['แลนด์เรซ', 'แลนเรซ', 'landrace'],
  duroc: ['ดูร็อค', 'ดูรอค', 'ดูร๊อค', 'duroc'],
  pietrain: ['เปียแตรง', 'เปียแตร็ง', 'pietrain'],
  native: ['พื้นเมือง', 'ไหหลำ', 'ควาย', 'ราด', 'พวง', 'native'],
}

function matchBreed(t) {
  // ถามถึงพันธุ์ใดพันธุ์หนึ่งโดยตรง ก็ถือว่าใช่
  const named = BREEDS.filter((b) =>
    t.includes(norm(b.name)) || t.includes(norm(b.en))
    || (BREED_ALIAS[b.id] || []).some((a) => t.includes(norm(a))))
  const general = BREED_WORDS.some((w) => t.includes(w))
  if (!named.length && !general) return null
  const list = named.length ? named : BREEDS
  return {
    kind: 'breed',
    title: named.length ? 'สายพันธุ์ที่ถามถึง' : 'สายพันธุ์ที่นิยมเลี้ยงในไทย',
    note: '',
    to: '/breeding',
    toLabel: 'ดูหน้าผสมพันธุ์',
    items: list.map((b) => ({
      img: b.photo || b.img,
      title: b.name,
      tag: b.en,
      lines: [b.color, b.strong?.[0]].filter(Boolean),
    })),
  }
}

/** คืนชุดรูปที่ตรงกับคำถาม หรือ null ถ้าไม่มีรูปที่เกี่ยว */
export function matchVisual(text) {
  const t = norm(text)
  if (!t) return null
  return matchVaccine(t) || matchBreed(t)
}

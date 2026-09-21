// ข้อมูลสรุปวัคซีนสุกรที่ฟาร์มใช้ — แสดงในหน้า "ข้อมูลวัคซีน"
//
// แก้/เพิ่มได้ที่ไฟล์นี้ไฟล์เดียว ไม่ต้องแตะหน้าเว็บ
// ค่าที่ไม่แน่ใจให้ใส่ null — หน้าเว็บจะโชว์ "ยึดตามฉลาก" แทน ดีกว่าใส่ตัวเลขผิด
//
//   id        รหัสสั้นใช้ใน URL (/vaccine-info?v=fmd)
//   name      ชื่อที่ใช้ในฟาร์ม (ใช้จับคู่กับบันทึกการฉีดในฐานข้อมูล — ดู match)
//   match     คำที่พบในชื่อวัคซีนตอนบันทึก (ตัวพิมพ์เล็ก) ไว้หาว่าฉีดล่าสุดเมื่อไหร่
//   route     'IM' ฉีดเข้ากล้ามเนื้อ | 'SC' ฉีดเข้าใต้ผิวหนัง
//   dose      ปริมาณต่อตัว (ข้อความ)
//   repeat    ฉีดซ้ำ (ข้อความ)  · repeatDays ตัวเลขวัน (ไว้คำนวณนัด ถ้าไม่มีกำหนดในระบบ)
//   schedule  [{label, when}] เข็มแรก/เข็มกระตุ้น
//   packs     ขนาดบรรจุที่มี
//   notes     สิ่งที่ควรรู้ 2-4 ข้อ
//   image     รูปขวดวัคซีน วางไว้ที่ public/vaccines/<id>.webp (ไม่มีไฟล์ = โชว์ไอคอนแทน)

export const VACCINES = [
  {
    id: 'fmd',
    name: 'ปากและเท้าเปื่อย',
    fullName: 'วัคซีนโรคปากและเท้าเปื่อยสำหรับสุกร (FMD)',
    match: ['ปากเท้า', 'ปากและเท้า', 'fmd'],
    route: 'IM',
    dose: '2 มล./ตัว',
    repeat: 'ทุก 6 เดือน',
    repeatDays: 180,
    schedule: [
      { label: 'เข็มที่ 1', when: 'อายุสุกร 2 เดือน' },
      { label: 'เข็มที่ 2', when: 'อายุสุกร 3 เดือน' },
    ],
    packs: ['10 โดส', '75 โดส'],
    notes: ['เก็บที่ 2–8°C', 'ใช้ตามฉลากหรือคำแนะนำสัตวแพทย์', 'บันทึกทุกครั้งหลังฉีด'],
    image: '/vaccines/fmd.webp',
  },
  {
    id: 'prrs',
    name: 'PRRS',
    fullName: 'วัคซีนโรค PRRS (โรคระบบสืบพันธุ์และระบบหายใจ)',
    match: ['prrs', 'เพิร์ส'],
    route: 'IM',
    dose: null,
    repeat: null,
    repeatDays: null,
    schedule: [],
    packs: [],
    notes: ['เก็บที่ 2–8°C', 'โดสและรอบฉีดยึดตามฉลาก', 'บันทึกทุกครั้งหลังฉีด'],
    image: '/vaccines/prrs.webp',
  },
  {
    id: 'csf',
    name: 'อหิวาต์สุกร',
    fullName: 'วัคซีนโรคอหิวาต์สุกร (Classical Swine Fever)',
    match: ['อหิวา', 'csf', 'swine fever'],
    route: 'IM',
    dose: null,
    repeat: null,
    repeatDays: null,
    schedule: [],
    packs: [],
    notes: ['เก็บที่ 2–8°C', 'โดสและรอบฉีดยึดตามฉลาก', 'บันทึกทุกครั้งหลังฉีด'],
    image: '/vaccines/csf.webp',
  },
]

export const ROUTE_LABEL = { IM: 'ฉีดเข้ากล้ามเนื้อ', SC: 'ฉีดเข้าใต้ผิวหนัง' }

// หาวัคซีนในแคตตาล็อกจากชื่อที่บันทึกไว้ (ชื่อที่คนพิมพ์/พูดสะกดไม่เหมือนกัน จับด้วยคำที่มีร่วมกัน)
export function findVaccine(name = '') {
  const n = name.toLowerCase().replace(/\s+/g, '')
  return VACCINES.find((v) => v.match.some((m) => n.includes(m.replace(/\s+/g, '')))) || null
}

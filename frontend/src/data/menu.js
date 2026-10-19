// โครงเมนูของทั้งเว็บ — ที่เดียวจบ
//
// เดิมมีสองชุดที่ต้องคอยดูแลให้ตรงกัน: รายการในลิ้นชักเมนู (App.jsx)
// กับตารางทางลัดในหน้า "รวมทุกเมนู" (MenuGrid.jsx)
// พอเพิ่มหน้าใหม่แล้วลืมแก้อีกที่ เมนูสองที่ก็ไม่ตรงกัน
//
// internal: true = ต้องล็อกอินก่อน คนนอกไม่ต้องเห็น เพราะกดไปก็เข้าไม่ได้
// badge    = ตัวเลขแจ้งเตือนที่หน้า "รวมทุกเมนู" ไปดึงมาใส่เอง

/** ทางลัดบนสุด ไม่ได้อยู่ในหมวดไหน เพราะเป็นทางเข้า-ออกของทั้งเว็บ */
export const MENU_TOP = [
  { to: '/overview', label: 'หน้าแรก', icon: 'ti-home' },
  { to: '/menu', label: 'รวมทุกเมนู', icon: 'ti-layout-grid' },
  { to: '/features', label: 'ทำอะไรได้บ้าง', icon: 'ti-sparkles' },
]

/** หมวดงานจริงในฟาร์ม เรียงตามลำดับที่คนใช้บ่อย */
export const MENU_GROUPS = [
  {
    title: 'ดูแลหมู',
    items: [
      { to: '/tasks', label: 'งานวันนี้', icon: 'ti-checkbox', internal: true, badge: 'tasks' },
      { to: '/pig-log', label: 'โรงเรือน', icon: 'ti-building-warehouse', internal: true },
      { to: '/vaccine', label: 'วัคซีน', icon: 'ti-vaccine', internal: true, badge: 'due' },
      { to: '/vaccine-plan', label: 'แผนวัคซีนตามอายุ', icon: 'ti-calendar-stats', internal: true },
      { to: '/diseases', label: 'อาการของโรค', icon: 'ti-mood-sick' },
      { to: '/vet', label: 'ปรึกษาสัตวแพทย์', icon: 'ti-message-circle', internal: true },
    ],
  },
  {
    title: 'จัดการฟาร์ม',
    items: [
      { to: '/feed', label: 'อาหารสัตว์', icon: 'ti-bowl' },
      { to: '/breeding', label: 'การผสมพันธุ์', icon: 'ti-heart-handshake' },
      { to: '/cleaning', label: 'ทำความสะอาดโรงเรือน', icon: 'ti-spray' },
      { to: '/checklist', label: 'เช็กลิสต์มาตรฐานฟาร์ม', icon: 'ti-checklist' },
    ],
  },
  {
    title: 'ข้อมูลและรายงาน',
    items: [
      { to: '/forecast', label: 'สภาพอากาศ', icon: 'ti-cloud' },
      { to: '/sensors', label: 'กราฟข้อมูล', icon: 'ti-chart-line' },
      { to: '/history', label: 'รายงาน', icon: 'ti-report' },
      { to: '/vaccine-info', label: 'ข้อมูลวัคซีน', icon: 'ti-file-info' },
      { to: '/vaccine-guide', label: 'วิธีฉีดวัคซีน', icon: 'ti-needle' },
    ],
  },
]

/** ทางลัดใต้ช่องถามในหน้าแรก — เปิดเว็บมาครั้งแรกจะได้รู้ว่าทำอะไรได้บ้าง
 *  เอาเฉพาะที่ใช้บ่อยจริง ไม่ใช่ยกเมนูทั้งหมดมาวาง ไม่งั้นหน้าแรกก็รกเหมือนเดิม */
export const MENU_QUICK = [
  { to: '/tasks', label: 'งานวันนี้', icon: 'ti-checkbox', internal: true },
  { to: '/pig-log', label: 'โรงเรือน', icon: 'ti-building-warehouse', internal: true },
  { to: '/vaccine', label: 'วัคซีน', icon: 'ti-vaccine', internal: true },
  { to: '/diseases', label: 'อาการของโรค', icon: 'ti-mood-sick' },
  { to: '/cleaning', label: 'ล้างโรงเรือน', icon: 'ti-spray' },
  { to: '/feed', label: 'อาหารสัตว์', icon: 'ti-bowl' },
  { to: '/menu', label: 'ดูทั้งหมด', icon: 'ti-layout-grid' },
]

/** ท้ายเมนู ของที่นาน ๆ เข้าที */
export const MENU_BOTTOM = [
  { to: '/settings', label: 'ตั้งค่า', icon: 'ti-settings', internal: true },
]

/** หมวดที่เหลือหลังกรองหน้าที่ต้องล็อกอินออก — หมวดที่ว่างเปล่าไม่ต้องคืนมา */
export function visibleGroups(isAdmin) {
  return MENU_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => isAdmin || !i.internal) }))
    .filter((g) => g.items.length)
}

export const visibleItems = (list, isAdmin) => list.filter((i) => isAdmin || !i.internal)

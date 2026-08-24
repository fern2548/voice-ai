// ข้อมูลจำลองทั้งหมดของฟาร์ม — จุดเดียวที่ต้องเปลี่ยนเมื่อต่อ API จริง
// เมื่อถึงเวลาต่อ backend ให้ทำ fetch แล้วคืนค่าโครงสร้างหน้าตาเดียวกันนี้

export const farmData = {
  pigs: 1248,
  sickToday: 12,
  alerts: 3,
  barns: [
    { id: 1, name: 'โรงเรือน 1', pigs: 320, temperature: 27.2, humidity: 68, light: 82, status: 'ปกติ' },
    { id: 2, name: 'โรงเรือน 2', pigs: 298, temperature: 29.6, humidity: 74, light: 76, status: 'เฝ้าระวัง' },
    { id: 3, name: 'โรงเรือน 3', pigs: 342, temperature: 26.8, humidity: 65, light: 88, status: 'ปกติ' },
  ],
}

export const vaccineRecords = [
  { id: 1, date: '2026-08-18', barn: 'โรงเรือน 1', vaccine: 'ปากเท้าเปื่อย (FMD)', pigs: 120, nextDue: '2026-09-17' },
  { id: 2, date: '2026-08-15', barn: 'โรงเรือน 3', vaccine: 'อหิวาต์สุกร (CSF)', pigs: 98, nextDue: '2026-11-13' },
  { id: 3, date: '2026-08-11', barn: 'โรงเรือน 2', vaccine: 'PRRS', pigs: 76, nextDue: '2026-10-10' },
  { id: 4, date: '2026-08-04', barn: 'โรงเรือน 1', vaccine: 'พาร์โวไวรัส', pigs: 64, nextDue: '2026-12-02' },
]

export const healthCases = [
  { id: 1, barn: 'โรงเรือน 2', count: 6, symptom: 'ไอ หายใจหอบ', status: 'กำลังรักษา' },
  { id: 2, barn: 'โรงเรือน 1', count: 4, symptom: 'ท้องเสีย', status: 'กำลังรักษา' },
  { id: 3, barn: 'โรงเรือน 3', count: 2, symptom: 'ซึม ไม่กินอาหาร', status: 'เฝ้าดูอาการ' },
]

export const weatherNow = {
  temperature: 31.4,
  humidity: 72,
  condition: 'มีเมฆบางส่วน',
  wind: 8.2,
  rainChance: 35,
}

// อุณหภูมิรายชั่วโมงสำหรับกราฟเล็กในหน้าพยากรณ์อากาศ
export const weatherTrend = [
  { time: '06:00', temp: 26.1 },
  { time: '08:00', temp: 27.8 },
  { time: '10:00', temp: 29.9 },
  { time: '12:00', temp: 31.8 },
  { time: '14:00', temp: 32.6 },
  { time: '16:00', temp: 31.4 },
  { time: '18:00', temp: 29.2 },
  { time: '20:00', temp: 27.6 },
]

export const reports = [
  { id: 'daily', title: 'รายงานประจำวัน', description: 'สรุปภาพรวมฟาร์มทั้งหมดใน 1 วัน', updated: 'วันนี้ 08:00' },
  { id: 'health', title: 'รายงานสุขภาพ', description: 'เคสป่วย อาการ และสถานะการรักษา', updated: 'วันนี้ 07:30' },
  { id: 'vaccine', title: 'รายงานวัคซีน', description: 'ประวัติการฉีดและกำหนดฉีดครั้งถัดไป', updated: 'เมื่อวาน 18:00' },
  { id: 'environment', title: 'รายงานสภาพแวดล้อม', description: 'อุณหภูมิ ความชื้น และแสงในโรงเรือน', updated: 'วันนี้ 09:00' },
]

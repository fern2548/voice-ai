// ข้อมูลอาหารสุกร — ตารางการกิน ความต้องการโภชนะ และวัตถุดิบที่ฟาร์มหาได้
//
// แก้ตัวเลขได้ที่ไฟล์นี้ไฟล์เดียว (ราคาวัตถุดิบแก้ได้จากหน้าเว็บด้วย แล้วจำไว้ในเครื่อง)
// ค่าโภชนะเป็นค่าเฉลี่ยอ้างอิง ของจริงแต่ละล็อตต่างกันได้ ±10% ถ้ามีผลวิเคราะห์ให้ใส่ตามจริง

// ตารางมาตรฐานการกินอาหารของสุกรตามอายุ (จากเอกสารการเลี้ยงสุกรขุน)
//   age       อายุ (วัน)
//   weight    น้ำหนักตัว (กก.)
//   adg       อัตราการเจริญเติบโต (กรัม/วัน)
//   fcr       ประสิทธิภาพการใช้อาหาร (กก.อาหาร ต่อ น้ำหนักเพิ่ม 1 กก.)
//   perDay    อาหารที่กินต่อตัวต่อวัน (กก.)
//   cumulative ปริมาณอาหารสะสมตั้งแต่เริ่ม (กก./ตัว)
export const FEED_TABLE = [
  { age: 30, weight: 6.5, adg: 150, fcr: null, perDay: 0.30, cumulative: 0.4 },
  { age: 42, weight: 9.0, adg: 330, fcr: 1.5, perDay: 0.50, cumulative: 5.0 },
  { age: 60, weight: 15.0, adg: 500, fcr: 1.6, perDay: 1.0, cumulative: 15.0 },
  { age: 70, weight: 22.0, adg: 600, fcr: 1.8, perDay: 1.4, cumulative: 27.0 },
  { age: 82, weight: 30.0, adg: 650, fcr: 2.2, perDay: 1.5, cumulative: 45.0 },
  { age: 94, weight: 40.0, adg: 700, fcr: 2.3, perDay: 2.0, cumulative: 67.0 },
  { age: 106, weight: 50.0, adg: 720, fcr: 2.3, perDay: 2.2, cumulative: 90.0 },
  { age: 120, weight: 60.0, adg: 750, fcr: 2.4, perDay: 2.4, cumulative: 125 },
  { age: 133, weight: 70.0, adg: 780, fcr: 2.5, perDay: 2.6, cumulative: 155 },
  { age: 145, weight: 80.0, adg: 800, fcr: 2.6, perDay: 2.8, cumulative: 190 },
  { age: 158, weight: 90.0, adg: 800, fcr: 3.0, perDay: 3.0, cumulative: 225 },
  { age: 170, weight: 100.0, adg: 800, fcr: 3.0, perDay: 3.0, cumulative: 260 },
]

// ความต้องการโภชนะตามช่วงน้ำหนัก — โปรตีน (%) และพลังงานใช้ประโยชน์ได้ ME (kcal/kg)
export const NUTRIENT_NEEDS = [
  { id: 'nursery', label: 'ลูกสุกรอนุบาล', maxWeight: 15, cp: 20, me: 3300 },
  { id: 'starter', label: 'สุกรเล็ก', maxWeight: 30, cp: 18, me: 3250 },
  { id: 'grower', label: 'สุกรรุ่น', maxWeight: 60, cp: 16, me: 3150 },
  { id: 'finisher', label: 'สุกรขุน', maxWeight: 999, cp: 14, me: 3100 },
]

// วัตถุดิบที่ใช้ผสมได้ — cp โปรตีน (%) · me พลังงาน (kcal/kg) · price ราคาอ้างอิง (บาท/กก.)
// max = สัดส่วนสูงสุดที่ใส่ได้ (%) เกินกว่านี้จะมีปัญหา เช่น ท้องเสีย กินไม่ลง หรือไขมันนิ่ม
export const INGREDIENTS = [
  { id: 'corn', name: 'ข้าวโพดบด', cp: 8.5, me: 3350, price: 11, max: 70, note: 'แหล่งพลังงานหลัก ราคาถูกที่สุดต่อพลังงาน' },
  { id: 'corn_whole', name: 'เมล็ดข้าวโพด', cp: 8.5, me: 3300, price: 10, max: 60, note: 'ต้องบดก่อนให้กิน ไม่งั้นย่อยไม่ได้' },
  { id: 'rice_bran', name: 'รำละเอียด', cp: 12, me: 2900, price: 9.5, max: 30, note: 'ถูกแต่ไขมันสูง ใส่มากทำให้ไขมันซากนิ่มและหืนเร็ว' },
  { id: 'soybean', name: 'กากถั่วเหลือง', cp: 44, me: 2600, price: 20, max: 35, note: 'แหล่งโปรตีนหลัก กรดอะมิโนดี' },
  { id: 'fishmeal', name: 'ปลาป่น', cp: 58, me: 2800, price: 36, max: 8, note: 'โปรตีนสูงมาก แต่แพงและใส่มากทำให้เนื้อมีกลิ่น' },
  { id: 'chicken_meal', name: 'ไก่ป่น', cp: 55, me: 2700, price: 28, max: 8, note: 'โปรตีนสูง ราคาถูกกว่าปลาป่น คุณภาพแปรปรวนตามล็อต' },
  { id: 'fish_solubles', name: 'น้ำนึ่งปลา', cp: 30, me: 2200, price: 12, max: 5, note: 'ช่วยให้กินได้ดีขึ้น ใส่น้อย ๆ พอ' },
  { id: 'oil', name: 'น้ำมันพืช/น้ำมันปาล์ม', cp: 0, me: 8600, price: 45, max: 5, note: 'เติมพลังงานให้ถึงเกณฑ์ในสูตรลูกสุกร ใส่เกินทำให้อาหารเหม็นหืน' },
]

// พรีมิกซ์วิตามิน-แร่ธาตุ + เกลือ ต้องมีเสมอ ไม่ใช่ตัวเลือก
// (สูตรที่ได้โปรตีนพอแต่ขาดแร่ธาตุ ทำให้ขาหัก กระดูกอ่อน โตไม่ดี)
export const PREMIX = { id: 'premix', name: 'พรีมิกซ์ + เกลือ', cp: 0, me: 0, price: 60, percent: 1.5 }

// ราคาอาหารสำเร็จรูปสำหรับเทียบว่าผสมเองประหยัดกว่าเท่าไหร่ (บาท/กก.)
export const READY_FEED_PRICE = { nursery: 26, starter: 22, grower: 19, finisher: 18 }

export function needsFor(weight) {
  return NUTRIENT_NEEDS.find((n) => weight <= n.maxWeight) || NUTRIENT_NEEDS[NUTRIENT_NEEDS.length - 1]
}

// เทียบอายุ (วัน) กับตาราง แล้วเทียบบัญญัติไตรยางศ์ระหว่างสองแถวที่ใกล้ที่สุด
// ตารางมีเป็นช่วง ๆ ถ้าใช้แถวที่ใกล้ที่สุดเฉย ๆ ค่าจะกระโดด ทำให้ปริมาณอาหารเพี้ยนได้หลายสิบกิโลต่อรุ่น
export function feedForAge(age) {
  const t = FEED_TABLE
  if (age <= t[0].age) return { ...t[0], estimated: age < t[0].age }
  if (age >= t[t.length - 1].age) return { ...t[t.length - 1], estimated: age > t[t.length - 1].age }
  for (let i = 0; i < t.length - 1; i++) {
    const a = t[i], b = t[i + 1]
    if (age >= a.age && age <= b.age) {
      const r = (age - a.age) / (b.age - a.age)
      const mix = (k) => +(a[k] + (b[k] - a[k]) * r).toFixed(2)
      return {
        age, weight: mix('weight'), adg: Math.round(a.adg + (b.adg - a.adg) * r),
        fcr: a.fcr && b.fcr ? mix('fcr') : b.fcr, perDay: mix('perDay'), cumulative: mix('cumulative'),
        estimated: false,
      }
    }
  }
  return { ...t[t.length - 1], estimated: true }
}

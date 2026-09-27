// หาสูตรผสมอาหารที่ "โปรตีนและพลังงานถึงเกณฑ์" และ "ถูกที่สุด" จากวัตถุดิบที่ฟาร์มมี
//
// วิธีคิด: ไล่ลองสัดส่วนจริง ๆ ทุกแบบ (ทีละ 2.5%) ของวัตถุดิบ 2-4 ชนิด แล้วเก็บสูตรที่ถูกที่สุดไว้
// ไม่ใช้ไลบรารีคณิตศาสตร์ เพราะวัตถุดิบมีไม่กี่ชนิด ไล่ตรง ๆ เร็วพอและตรวจสอบง่ายกว่า
//
// เงื่อนไขที่ต้องผ่าน:
//   - โปรตีน (CP) ไม่ต่ำกว่าที่ช่วงอายุนั้นต้องการ
//   - พลังงาน (ME) ไม่ต่ำกว่าเกณฑ์ (ยอมต่ำได้ไม่เกิน 2% เพราะสูตรบ้าน ๆ ชนเพดานพลังงานยาก)
//   - แต่ละตัวห้ามเกินสัดส่วนสูงสุดของมัน (เช่น รำมากไปหมูท้องเสีย ไขมันซากนิ่ม)

const STEP = 2.5                 // ไล่ทีละ 2.5% ละเอียดพอและยังเร็ว
const ME_TOLERANCE = 0.98        // ยอมให้พลังงานต่ำกว่าเกณฑ์ได้ 2%

function combinations(arr, k) {
  const out = []
  const pick = (start, cur) => {
    if (cur.length === k) return out.push([...cur])
    for (let i = start; i < arr.length; i++) {
      cur.push(arr[i]); pick(i + 1, cur); cur.pop()
    }
  }
  pick(0, [])
  return out
}

/**
 * @param ingredients วัตถุดิบที่เลือกใช้ [{id,name,cp,me,price,max}]
 * @param need        {cp, me} เกณฑ์ที่ต้องการ
 * @param premix      {percent, cp, me, price} ส่วนที่ล็อกไว้เสมอ
 * @returns {mix:[{...ingredient, percent}], cp, me, price} | null ถ้าหาสูตรที่ผ่านเกณฑ์ไม่ได้
 */
export function bestMix(ingredients, need, premix) {
  const base = premix?.percent || 0
  const room = 100 - base                      // ส่วนที่เหลือให้จัดสรร
  const units = Math.round(room / STEP)        // จำนวนหน่วยย่อย
  const usable = ingredients.filter((x) => x.max > 0 && x.price > 0)
  if (usable.length === 0) return null

  let best = null
  const consider = (picked, alloc) => {
    let cp = (premix?.cp || 0) * base / 100
    let me = (premix?.me || 0) * base / 100
    let price = (premix?.price || 0) * base / 100
    for (let i = 0; i < picked.length; i++) {
      const pct = alloc[i] * STEP
      if (pct > picked[i].max) return            // เกินสัดส่วนสูงสุดของวัตถุดิบตัวนั้น
      cp += picked[i].cp * pct / 100
      me += picked[i].me * pct / 100
      price += picked[i].price * pct / 100
    }
    if (cp < need.cp || me < need.me * ME_TOLERANCE) return
    if (best && price >= best.price) return
    best = {
      price: +price.toFixed(3),
      cp: +cp.toFixed(2),
      me: Math.round(me),
      mix: picked.map((ing, i) => ({ ...ing, percent: +(alloc[i] * STEP).toFixed(1) }))
        .filter((x) => x.percent > 0)
        .sort((a, b) => b.percent - a.percent),
    }
  }

  // ไล่แจกหน่วยย่อยให้วัตถุดิบที่เลือก (compositions) — ตัวสุดท้ายรับส่วนที่เหลือ
  const walk = (picked, idx, left, alloc) => {
    if (idx === picked.length - 1) {
      alloc[idx] = left
      return consider(picked, alloc)
    }
    const maxUnits = Math.min(left, Math.floor(picked[idx].max / STEP))
    for (let u = 0; u <= maxUnits; u++) {
      alloc[idx] = u
      walk(picked, idx + 1, left - u, alloc)
    }
  }

  for (let size = 2; size <= Math.min(4, usable.length); size++) {
    for (const picked of combinations(usable, size)) {
      // ต้องมีทั้งตัวให้พลังงานและตัวให้โปรตีน ไม่งั้นไม่มีทางผ่านเกณฑ์
      if (!picked.some((x) => x.cp >= 25) || !picked.some((x) => x.me >= 2800)) continue
      walk(picked, 0, units, new Array(size).fill(0))
    }
  }
  return best
}

/** ต้นทุนอาหารต่อวันของทั้งชุด และปริมาณวัตถุดิบที่ต้องเตรียม */
export function batchPlan(mix, kgPerDay) {
  return mix.map((m) => ({ ...m, kg: +(kgPerDay * m.percent / 100).toFixed(2) }))
}

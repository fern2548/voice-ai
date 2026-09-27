import { useEffect, useRef, useState } from 'react'

// แถบหัวข้อติดขอบบน — กดแล้วเลื่อนไปหัวข้อนั้นทันที และไฮไลต์หัวข้อที่กำลังดูอยู่
// ใช้ได้กับทุกหน้าที่ยาว ส่งมาเป็น [{ id, label, icon }] โดย id ต้องตรงกับ id ของ section ในหน้านั้น
// section ที่จะกระโดดไป ให้ใส่ className="pnav-target" ด้วย เพื่อไม่ให้หัวข้อโดนแถบบังตอนเลื่อนถึง
export default function SectionNav({ sections, label = 'หัวข้อในหน้านี้' }) {
  const [active, setActive] = useState(sections[0]?.id || '')
  const barRef = useRef(null)

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean)
    if (!els.length) return undefined
    // หัวข้อที่อยู่บนสุดของจอ (ใต้แถบ) คือหัวข้อที่ผู้ใช้กำลังดู
    const io = new IntersectionObserver((entries) => {
      const vis = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (vis[0]) setActive(vis[0].target.id)
    }, { rootMargin: '-150px 0px -55% 0px', threshold: 0 })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [sections])

  // จอแคบแถบจะเลื่อนแนวนอน ดึงปุ่มที่กำลังใช้งานให้อยู่ในสายตาเสมอ
  useEffect(() => {
    const bar = barRef.current
    const btn = bar?.querySelector('.pnav-btn.on')
    if (!bar || !btn) return
    const left = btn.offsetLeft - bar.scrollLeft
    if (left < 0 || left + btn.offsetWidth > bar.clientWidth) {
      const to = btn.offsetLeft - bar.clientWidth / 2 + btn.offsetWidth / 2
      bar.scrollTo({ left: to, behavior: 'smooth' })
      // บางเครื่องเลื่อนแบบนุ่มไม่ทำงาน ถ้าไม่ขยับให้เลื่อนทันทีแทน
      window.setTimeout(() => { if (Math.abs(bar.scrollLeft - to) > 4) bar.scrollLeft = to }, 250)
    }
  }, [active])

  const go = (id) => {
    const el = document.getElementById(id)
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const before = window.scrollY
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    setActive(id)
    // กันกรณีเลื่อนแบบนุ่มไม่ทำงาน (บางเบราว์เซอร์/บางมือถือ) — ถ้าหน้าไม่ขยับ ให้เลื่อนทันที
    if (!reduce) {
      window.setTimeout(() => {
        if (Math.abs(window.scrollY - before) < 2) el.scrollIntoView({ block: 'start' })
      }, 250)
    }
  }

  return (
    <nav className="pnav" ref={barRef} aria-label={label}>
      {sections.map((s) => (
        <button type="button" key={s.id} className={`pnav-btn ${active === s.id ? 'on' : ''}`}
          onClick={() => go(s.id)} aria-current={active === s.id ? 'true' : undefined}>
          <i className={`ti ${s.icon}`} aria-hidden="true" />
          <span>{s.label}</span>
        </button>
      ))}
    </nav>
  )
}

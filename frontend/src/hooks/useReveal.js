import { useEffect, useRef } from 'react'

/**
 * ทำให้ element ค่อย ๆ ปรากฏตอนเลื่อนถึง
 * ใช้ IntersectionObserver + CSS แทน framer-motion (5173 ไม่มี framer-motion ติดตั้งไว้)
 *
 * วิธีใช้: <div ref={useReveal()} className="reveal">...</div>
 * เมื่อเลื่อนถึงจะเติมคลาส .in ให้เอง
 */
export default function useReveal(options = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // เผื่อเบราว์เซอร์ไม่รองรับ หรือผู้ใช้ขอลดการเคลื่อนไหว -> แสดงเลย ไม่ต้องรอ
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced || typeof IntersectionObserver === 'undefined') {
      el.classList.add('in')
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)   // แสดงแล้วแสดงเลย ไม่ซ่อนกลับตอนเลื่อนออก
          }
        })
      },
      { rootMargin: options.rootMargin ?? '-80px', threshold: 0 }
    )

    io.observe(el)
    return () => io.disconnect()
  }, [options.rootMargin])

  return ref
}

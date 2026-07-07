import { useEffect, useRef, useState } from 'react'

// ดึงข้อมูลครั้งแรก แล้ว poll ซ้ำทุก ๆ intervalMs
// key: เปลี่ยนค่านี้เพื่อบังคับดึงใหม่ทันที (เช่นเปลี่ยนช่วงเวลา)
// คืน error ด้วย และไม่ล้าง data เดิมทิ้งเวลา fetch พัง (กันจอกระพริบว่าง)
export default function usePolling(fetcher, intervalMs, key) {
  const [data, setData] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [error, setError] = useState(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    let alive = true
    const run = () =>
      fetcherRef
        .current()
        .then((d) => {
          if (!alive) return
          setData(d)
          setUpdatedAt(new Date())
          setError(null)
        })
        .catch((e) => {
          if (!alive) return
          setError(e) // เก็บ error ไว้ให้ UI แสดง แต่คง data เดิมไว้
        })

    run()
    const id = setInterval(run, intervalMs)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [intervalMs, key])

  return { data, updatedAt, error }
}

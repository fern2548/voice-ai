import HomeShortcuts from '../components/HomeShortcuts.jsx'
import VoiceHero from '../components/VoiceHero.jsx'

/**
 * หน้าแรก — ปุ่มไมค์อยู่บนสุดเหมือนเดิม (เป็นจุดเด่นของระบบ)
 * ใต้ลงมาเป็นทางลัดจัดกลุ่มตามงาน เดิมหน้านี้มีแค่ไมค์
 * จะไปหน้าอื่นต้องเปิดเมนูสามขีดทุกครั้ง ซึ่งช้าและหายาก
 *
 * สภาพแวดล้อมโรงเรือนอยู่หน้าพยากรณ์อากาศ (ค่าปัจจุบัน + พยากรณ์ ดูที่เดียวจบ)
 */
export default function OverviewPage() {
  return (
    <>
      <VoiceHero />
      <HomeShortcuts />
    </>
  )
}

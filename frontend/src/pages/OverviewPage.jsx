import VoiceHero from '../components/VoiceHero.jsx'

/**
 * หน้าแรก — จอเดียวจบ มีแค่ตัวรับคำสั่งด้วยเสียง
 * ทางลัดไปหน้าอื่น ๆ อยู่ที่หน้า /menu (รวมทุกเมนู) ไม่เอามารกหน้านี้
 * สภาพแวดล้อมโรงเรือนอยู่หน้าพยากรณ์อากาศ (ค่าปัจจุบัน + พยากรณ์ ดูที่เดียวจบ)
 */
export default function OverviewPage() {
  return <VoiceHero />
}

import useVoiceSession from '../hooks/useVoiceSession.js'
import HeroSection from '../sections/HeroSection.jsx'

/**
 * หน้าแรก — มีจอรับคำสั่งด้วยเสียงอย่างเดียว เต็มหนึ่งหน้าจอพอดี ไม่มีอะไรให้เลื่อน
 * เนื้อหาเล่าเรื่องผลิตภัณฑ์ทั้งหมดย้ายไปอยู่หน้า /features แล้ว
 */
export default function Home() {
  const voice = useVoiceSession()

  return <HeroSection voice={voice} />
}

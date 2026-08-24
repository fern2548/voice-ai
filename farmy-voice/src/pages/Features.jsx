import useVoiceSession from '../hooks/useVoiceSession.js'
import VoiceControlSection from '../sections/VoiceControlSection.jsx'
import FarmIntelligenceSection from '../sections/FarmIntelligenceSection.jsx'
import LocalAISection from '../sections/LocalAISection.jsx'
import GeminiSection from '../sections/GeminiSection.jsx'
import NavigationSection from '../sections/NavigationSection.jsx'
import FinalCTASection from '../sections/FinalCTASection.jsx'

/**
 * หน้าเล่าเรื่องผลิตภัณฑ์ — ย้ายมาจากหน้าแรก
 * หน้าแรกเหลือแค่จอรับคำสั่งอย่างเดียว ส่วนเนื้อหาทั้งหมดมาอยู่ที่นี่
 * แต่ละ section คือหนึ่งสไลด์ของการเปิดตัว เรียงต่อกันเป็นหน้าเดียวยาว ๆ
 */
export default function Features() {
  const voice = useVoiceSession()

  return (
    <>
      <VoiceControlSection />
      <FarmIntelligenceSection />
      <LocalAISection />
      <GeminiSection />
      <NavigationSection />
      <FinalCTASection voice={voice} />
    </>
  )
}

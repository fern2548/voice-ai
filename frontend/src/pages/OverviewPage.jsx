import BarnEnvironment from '../components/BarnEnvironment.jsx'
import VoiceHero from '../components/VoiceHero.jsx'

/**
 * หน้าแรก — สภาพแวดล้อมโรงเรือน (ค่าเซนเซอร์ + สรุป + ต้นทุนที่ลดได้) แล้วต่อด้วยตัวรับคำสั่งด้วยเสียง
 */
export default function OverviewPage() {
  return (
    <>
      <BarnEnvironment />
      <VoiceHero />
    </>
  )
}

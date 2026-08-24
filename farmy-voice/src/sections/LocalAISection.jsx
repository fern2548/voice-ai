import { motion } from 'framer-motion'
import AIConversation from '../components/AIConversation.jsx'
import { GradientCloud } from '../components/AbstractFlow.jsx'

const turns = [
  { role: 'user', text: 'โรงเรือน 3 มีหมูป่วยกี่ตัว' },
  { role: 'farmy', text: 'วันนี้โรงเรือน 3 พบสุกรป่วย 7 ตัวค่ะ' },
]

/** SECTION 4 — ความรู้ภายในฟาร์ม เนื้อหาชิดซ้าย บทสนทนากินพื้นที่ใหญ่ */
export default function LocalAISection() {
  return (
    <section className="relative overflow-hidden py-section">
      <GradientCloud className="-left-40 top-1/4" size={640} tone="accent" />

      <div className="stage relative grid grid-cols-1 gap-20 lg:grid-cols-12 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
          className="lg:col-span-5"
        >
          <p className="eyebrow">Local AI</p>
          <h2 className="mt-6 text-statement font-semibold">รู้ทุกอย่างที่เกิดขึ้นในฟาร์ม</h2>
          <p className="mt-8 max-w-sm text-lg font-light leading-relaxed text-muted">
            ข้อมูลภายในฟาร์มของคุณ โดยไม่ต้องค้นหาเอง
          </p>
        </motion.div>

        <div className="lg:col-span-7 lg:pt-16">
          <AIConversation turns={turns} accent="accent" />
        </div>
      </div>
    </section>
  )
}

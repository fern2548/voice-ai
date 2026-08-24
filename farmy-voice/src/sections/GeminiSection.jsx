import { motion } from 'framer-motion'
import { DataField } from '../components/AbstractFlow.jsx'

const questions = ['PRRS คืออะไร?', 'ป้องกัน ASF อย่างไร?', 'Biosecurity ที่ดีควรทำอะไรบ้าง?']

/**
 * SECTION 5 — ความรู้ภายนอก
 * จัดกลับด้านกับ section 4 (ภาพซ้าย ข้อความขวา) เพื่อให้จังหวะการอ่านสลับกัน
 */
export default function GeminiSection() {
  return (
    <section className="relative overflow-hidden py-section">
      <div className="stage relative grid grid-cols-1 items-center gap-20 lg:grid-cols-12 lg:gap-16">
        {/* ภาพสนามข้อมูลที่แผ่ออก */}
        <div className="relative order-2 flex min-h-[420px] items-center justify-center lg:order-1 lg:col-span-6">
          <DataField className="h-[560px] w-[560px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
          className="order-1 lg:order-2 lg:col-span-6"
        >
          <p className="eyebrow">Gemini AI</p>
          <h2 className="mt-6 text-statement font-semibold">ถามได้มากกว่าข้อมูลในฟาร์ม</h2>
          <p className="mt-8 max-w-md text-lg font-light leading-relaxed text-muted">
            เชื่อมต่อความรู้ภายนอก เพื่อช่วยคุณตัดสินใจ
          </p>

          <ul className="mt-14 space-y-6">
            {questions.map((q, i) => (
              <motion.li
                key={q}
                initial={{ opacity: 0, x: -18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.9, delay: 0.2 + i * 0.16, ease: [0.22, 0.61, 0.36, 1] }}
                className="border-b border-line/60 pb-6 text-xl font-light tracking-tight text-muted sm:text-2xl"
              >
                “{q}”
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  )
}

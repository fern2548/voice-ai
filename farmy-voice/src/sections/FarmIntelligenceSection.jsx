import { motion } from 'framer-motion'
import FarmMetrics from '../components/FarmMetrics.jsx'
import { RadialGlow } from '../components/AbstractFlow.jsx'

/** SECTION 3 — แผงพาโนรามา ตัวเลขสำคัญ 3 ตัว ไม่ใช่การ์ด KPI */
export default function FarmIntelligenceSection() {
  return (
    <section className="relative overflow-hidden py-section">
      <RadialGlow className="left-1/2 top-1/2 h-[720px] w-[1100px] -translate-x-1/2 -translate-y-1/2" />

      <div className="stage relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
          className="mb-24 max-w-3xl"
        >
          <p className="eyebrow">Farm intelligence</p>
          <h2 className="mt-6 text-statement font-semibold">ฟาร์มของคุณ พูดกับคุณได้</h2>
        </motion.div>

        <FarmMetrics />
      </div>
    </section>
  )
}

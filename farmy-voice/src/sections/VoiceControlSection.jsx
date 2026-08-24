import { motion } from 'framer-motion'
import { PrimaryBlock, SecondaryBlock, VoiceToDataVisual } from '../components/FeatureShowcase.jsx'
import { LuminousCurve } from '../components/AbstractFlow.jsx'

/** SECTION 2 — One voice. Your whole farm. จัดแบบ asymmetric 60 / 40 */
export default function VoiceControlSection() {
  return (
    <section className="relative overflow-hidden py-section">
      <LuminousCurve className="right-0 top-0 h-[520px] w-[60%]" flip />

      <div className="stage relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
          className="mb-20 max-w-2xl"
        >
          <p className="eyebrow">One voice. Your whole farm.</p>
          <h2 className="mt-6 text-statement font-semibold">เสียงเดียว ครอบคลุมทั้งฟาร์ม</h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <PrimaryBlock
              title="แค่พูด ก็เข้าถึงทั้งฟาร์ม"
              description="ดูข้อมูลโรงเรือน สุขภาพสุกร วัคซีน และรายงานได้ทันที"
            >
              <VoiceToDataVisual />
            </PrimaryBlock>
          </div>

          <div className="grid gap-6 lg:col-span-2">
            <SecondaryBlock title="ไปหน้าโรงเรือน" command="พาไปหน้าโรงเรือน 3" to="/barns" delay={0.12} />
            <SecondaryBlock title="เปิดรายงาน" command="เปิดรายงานวันนี้" to="/reports" delay={0.24} />
          </div>
        </div>
      </div>
    </section>
  )
}

import { motion } from 'framer-motion'
import VoiceNavigation from '../components/VoiceNavigation.jsx'

/** SECTION 6 — สั่งด้วยเสียงแทนการหาเมนู */
export default function NavigationSection() {
  return (
    <section className="relative py-section">
      <div className="stage">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
          className="mb-20 max-w-3xl"
        >
          <p className="eyebrow">Voice navigation</p>
          <h2 className="mt-6 text-statement font-semibold">ไม่ต้องหาเมนู แค่บอก Farmy Voice</h2>
        </motion.div>

        <VoiceNavigation />
      </div>
    </section>
  )
}

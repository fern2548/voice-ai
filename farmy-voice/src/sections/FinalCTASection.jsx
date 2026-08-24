import { motion } from 'framer-motion'
import VoiceOrb from '../components/VoiceOrb.jsx'
import { RadialGlow } from '../components/AbstractFlow.jsx'

/**
 * SECTION 7 — สไลด์ปิด เรียบที่สุดของทั้งหน้า
 * @param {ReturnType<import('../hooks/useVoiceSession.js').useVoiceSession>} props.voice
 */
export default function FinalCTASection({ voice }) {
  return (
    <section className="relative flex min-h-[92svh] items-center overflow-hidden py-section">
      <RadialGlow className="left-1/2 top-1/2 h-[760px] w-[980px] -translate-x-1/2 -translate-y-1/2" />

      <div className="stage relative flex flex-col items-center text-center">
        <motion.h2
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 1.3, ease: [0.22, 0.61, 0.36, 1] }}
          className="max-w-4xl text-statement font-semibold"
        >
          ทุกข้อมูลในฟาร์ม
          <br />
          เริ่มต้นจากเสียงของคุณ
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1.4, delay: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
          className="mt-20"
        >
          <VoiceOrb
            status={voice.status}
            statusText={voice.statusText}
            busy={voice.busy}
            onStart={voice.start}
            size="lg"
            cta="เริ่มคุยกับ Farmy Voice"
          />
        </motion.div>

        <motion.button
          type="button"
          onClick={voice.start}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5 }}
          className="group mt-12 text-lg font-medium tracking-tight transition-opacity duration-500 hover:opacity-70"
        >
          เริ่มคุยกับ Farmy Voice
          <span className="mx-auto mt-1.5 block h-px w-0 bg-accent transition-all duration-700 group-hover:w-full" />
        </motion.button>
      </div>
    </section>
  )
}

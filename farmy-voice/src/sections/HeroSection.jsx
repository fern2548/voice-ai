import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import VoiceBar from '../components/VoiceBar.jsx'

const rise = (delay) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1, delay, ease: [0.22, 0.61, 0.36, 1] },
})

/**
 * SECTION 1 — หน้าเปิด
 * ตั้งใจให้โล่งที่สุดในเว็บ: หัวข้อกลางจอ + แคปซูลรับคำสั่งหนึ่งอัน
 * ไม่มีลวดลายอื่นนอกจากแสงไล่สีนุ่ม ๆ ด้านหลัง
 *
 * @param {{voice: ReturnType<import('../hooks/useVoiceSession.js').useVoiceSession>}} props
 */
export default function HeroSection({ voice }) {
  const listening = voice.status === 'listening'

  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-4 pb-16 pt-24 sm:px-6">
      {/* แสงฟ้านุ่ม ๆ ก้อนเดียว จางเข้าหาพื้นหลัง */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 62% 52% at 50% 52%, rgb(var(--c-accent) / 0.16), transparent 68%)',
        }}
      />

      <div className="relative flex w-full flex-col items-center text-center">
        {/* ตั้งใจไม่ใส่ max-width และบังคับไม่ตัดบรรทัด ให้อยู่บรรทัดเดียว
            ขนาดจึงผูกกับความกว้างจอ (vw) ไม่ใช่ค่าตายตัว
            ยกเว้นจอแคบกว่า 360px ที่ปล่อยให้ตัดบรรทัดได้ ไม่งั้นข้อความจะล้นออกนอกจอ */}
        <motion.h1
          {...rise(0.05)}
          className="whitespace-normal text-[clamp(20px,3vw,44px)] font-light leading-[1.15] tracking-tight min-[360px]:whitespace-nowrap"
        >
          Farmy Voice ผู้ช่วยเสียงประจำฟาร์มของคุณ
        </motion.h1>

        <motion.p {...rise(0.16)} className="mt-5 text-base font-light text-muted sm:text-lg">
          ถามข้อมูล สั่งงาน และเข้าถึงฟาร์ม ด้วยเสียงของคุณ
        </motion.p>

        <motion.div {...rise(0.28)} className="mt-12 flex w-full justify-center">
          <VoiceBar
            onMic={voice.start}
            onSubmit={voice.ask}
            listening={listening}
            busy={voice.busy}
          />
        </motion.div>

        {/* สถานะ + สิ่งที่ได้ยิน + คำตอบ อยู่ในพื้นที่เดียว ความสูงคงที่ ไม่ทำให้หน้ากระโดด */}
        <div className="mt-8 min-h-[124px] w-full max-w-[820px]">
          <AnimatePresence initial={false}>
            {voice.status !== 'idle' && (
              <motion.p
                key={voice.status}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="text-sm font-light text-faint"
              >
                {voice.statusText}
              </motion.p>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {voice.transcript && (
              <motion.p
                key={voice.transcript}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-3 text-[17px] font-light text-muted"
              >
                “{voice.transcript}”
              </motion.p>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {voice.result && (
              <motion.p
                key={voice.result.answer || voice.result.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
                className="mx-auto mt-4 max-w-2xl text-lg font-normal leading-relaxed sm:text-xl"
              >
                {voice.result.navigateTo
                  ? `กำลังพาไปที่หน้า${voice.result.label}`
                  : voice.result.answer}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* บรรทัดเล็กท้ายจอ — หน้านี้ไม่มีอะไรให้เลื่อนแล้ว จึงลิงก์ไปหน้าความสามารถแทน */}
      <motion.p
        {...rise(0.5)}
        className="absolute bottom-7 left-0 right-0 px-6 text-center text-[13px] font-light text-faint"
      >
        Farmy Voice เป็น AI และอาจให้ข้อมูลคลาดเคลื่อนได้ ·{' '}
        <Link
          to="/features"
          className="underline decoration-line underline-offset-4 transition-colors duration-500 hover:text-accent"
        >
          ดูว่าทำอะไรได้บ้าง
        </Link>
      </motion.p>
    </section>
  )
}

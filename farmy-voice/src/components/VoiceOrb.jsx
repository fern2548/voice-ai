import { AnimatePresence, motion } from 'framer-motion'
import { Mic } from 'lucide-react'

// ความสูงแท่งคลื่นเสียง คงที่ ไม่สุ่มตอน render
const BARS = [8, 16, 11, 26, 15, 34, 21, 44, 27, 54, 33, 43, 24, 34, 17, 26, 12, 19, 9, 14]

/** คลื่นเสียงบาง ๆ ขยับเฉพาะตอนกำลังฟัง (ใช้ภายในไฟล์นี้เท่านั้น) */
function Waveform({ active, className = '' }) {
  return (
    <div className={`flex h-12 items-center justify-center gap-[3px] ${className}`} aria-hidden="true">
      {BARS.map((h, i) => (
        <motion.span
          key={i}
          className="w-[2px] rounded-full bg-gradient-to-t from-accent to-iris"
          initial={false}
          animate={
            active
              ? { height: [h * 0.3, h, h * 0.45, h * 0.8, h * 0.3], opacity: 0.95 }
              : { height: h * 0.26, opacity: 0.3 }
          }
          transition={
            active
              ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: (i % 6) * 0.1 }
              : { duration: 0.8, ease: 'easeOut' }
          }
        />
      ))}
    </div>
  )
}

/**
 * แคปซูลกระจกลอย — ตัวควบคุมเสียงหลักของผลิตภัณฑ์
 * @param {{
 *   status: string, statusText: string, busy: boolean,
 *   onStart: () => void, size?: 'xl' | 'lg', cta?: string
 * }} props
 */
export default function VoiceOrb({ status, statusText, busy, onStart, size = 'xl', cta = 'คุยกับ Farmy Voice' }) {
  // ขนาดผูกกับความสูงจอ ไม่ใช่ค่าตายตัว — จอ 900px กับ 1080px จึงจัดวางได้พอดีทั้งคู่
  const side = size === 'xl' ? 'clamp(168px, 20vh, 248px)' : 'clamp(140px, 16vh, 184px)'
  const box = { width: side, height: side }
  const listening = status === 'listening'

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        {/* วงแหวนเสียงแผ่ออก เฉพาะตอนฟัง */}
        <AnimatePresence>
          {listening && (
            <>
              <motion.span
                key="r1"
                exit={{ opacity: 0 }}
                style={box}
                className="absolute animate-ring-expand rounded-full border border-accent/40"
              />
              <motion.span
                key="r2"
                exit={{ opacity: 0 }}
                className="absolute animate-ring-expand rounded-full border border-iris/30"
                style={{ ...box, animationDelay: '1.1s' }}
              />
            </>
          )}
        </AnimatePresence>

        {/* แสงนุ่มใต้แคปซูล */}
        <div
          className="absolute rounded-full blur-[70px] transition-opacity duration-1000"
          style={{
            ...box,
            background: 'radial-gradient(circle, rgb(var(--c-accent) / 0.55), transparent 68%)',
            opacity: busy ? 0.95 : 0.5,
          }}
          aria-hidden="true"
        />

        <motion.button
          type="button"
          onClick={onStart}
          aria-label={cta}
          whileHover={{ scale: busy ? 1 : 1.02 }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: 'tween', duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
          style={box}
          className="group relative flex items-center justify-center rounded-full"
        >
          {/* ตัวแคปซูลกระจก */}
          <span
            className="absolute inset-0 rounded-full backdrop-blur-2xl"
            style={{
              background:
                'linear-gradient(160deg, rgb(var(--c-raised) / 0.9), rgb(var(--c-raised) / 0.5))',
              boxShadow:
                '0 30px 90px -30px rgb(var(--c-accent) / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.14)',
            }}
            aria-hidden="true"
          />
          {/* ขอบไล่สีบางมาก */}
          <span
            className="absolute inset-0 rounded-full p-px opacity-80 transition-opacity duration-700 group-hover:opacity-100"
            style={{
              background:
                'linear-gradient(140deg, rgb(var(--c-accent) / 0.9), rgb(var(--c-iris) / 0.55) 45%, rgb(var(--c-aqua) / 0.7))',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
            aria-hidden="true"
          />
          <Mic
            className={`relative h-16 w-16 transition-colors duration-700 ${busy ? 'text-accent' : 'text-fg'}`}
            strokeWidth={1.15}
          />
        </motion.button>
      </div>

      <Waveform active={listening} className="mt-8 w-full max-w-xs" />

      {/* ข้อความสถานะ — ครอสเฟด ตัวเก่าลอยทับแล้วจางหาย
          ตั้งใจไม่ใช้ mode="wait" เพราะถ้า exit animation ไม่จบ (เช่นผู้ใช้สลับไปแท็บอื่น
          เบราว์เซอร์จะหยุด requestAnimationFrame) ข้อความจะค้างไม่เปลี่ยนอีกเลย */}
      <div className="relative mt-2 h-7 w-full">
        <AnimatePresence initial={false}>
          <motion.p
            key={status}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
            className="absolute inset-x-0 top-0 text-lg font-medium tracking-tight text-muted"
          >
            {statusText}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}

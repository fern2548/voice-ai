import { motion } from 'framer-motion'

/**
 * คลังลวดลายนามธรรม — ใช้ section ละ 1–2 ชิ้นเท่านั้น
 * ทุกชิ้นสื่อถึง เสียง / ปัญญา / การไหลของข้อมูล / การเชื่อมต่อ
 * ทั้งหมดเป็น pointer-events-none และอยู่หลังเนื้อหา ไม่บังการอ่าน
 */

/** ก้อนเมฆไล่สีเบลอ — ใช้เป็นแสงพื้นหลังหลัก */
export function GradientCloud({ className = '', tone = 'accent', size = 620, delay = 0 }) {
  const tones = {
    accent: 'rgb(var(--c-accent) / 0.30)',
    iris: 'rgb(var(--c-iris) / 0.26)',
    aqua: 'rgb(var(--c-aqua) / 0.22)',
    warm: 'rgb(var(--c-warm) / 0.20)',
  }
  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full blur-[120px] ${className}`}
      style={{ width: size, height: size, background: tones[tone] }}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 2.4, delay, ease: [0.22, 0.61, 0.36, 1] }}
    />
  )
}

/** แสงรัศมีนุ่ม ๆ กลางจอ */
export function RadialGlow({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
      style={{
        background:
          'radial-gradient(ellipse at center, rgb(var(--c-accent) / 0.16), rgb(var(--c-iris) / 0.07) 42%, transparent 72%)',
      }}
    />
  )
}

/** เส้นโค้งเรืองแสงเส้นเดียว บาง สง่า */
export function LuminousCurve({ className = '', flip = false }) {
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
      viewBox="0 0 900 500"
      fill="none"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="curve-g" x1={flip ? '1' : '0'} y1="0" x2={flip ? '0' : '1'} y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0" />
          <stop offset="50%" stopColor="rgb(var(--c-iris))" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rgb(var(--c-aqua))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={flip ? 'M900 60 C 620 200, 700 380, 380 440 S 60 470, -20 430' : 'M0 60 C 280 200, 200 380, 520 440 S 840 470, 920 430'}
        stroke="url(#curve-g)"
        strokeWidth="1.3"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: '-120px' }}
        transition={{ duration: 2.6, ease: 'easeInOut' }}
      />
    </svg>
  )
}

/** สนามข้อมูลที่แผ่ออก — ใช้แทนความรู้ภายนอกที่เชื่อมต่อเข้ามา */
export function DataField({ className = '' }) {
  // จุดวางบนวงกลมซ้อนกันสามชั้น คำนวณครั้งเดียว ไม่สุ่มตอน render
  const rings = [
    { r: 96, n: 6, dur: 46 },
    { r: 158, n: 10, dur: 62 },
    { r: 224, n: 14, dur: 84 },
  ]
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
      viewBox="-280 -280 560 560"
      fill="none"
    >
      <defs>
        <radialGradient id="df-core">
          <stop offset="0%" stopColor="rgb(var(--c-iris))" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rgb(var(--c-iris))" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r="120" fill="url(#df-core)" />
      {rings.map((ring, ri) => (
        <motion.g
          key={ri}
          animate={{ rotate: ri % 2 === 0 ? 360 : -360 }}
          transition={{ duration: ring.dur, repeat: Infinity, ease: 'linear' }}
        >
          <circle
            r={ring.r}
            stroke="rgb(var(--c-line))"
            strokeWidth="1"
            fill="none"
            opacity="0.55"
          />
          {Array.from({ length: ring.n }).map((_, i) => {
            const a = (i / ring.n) * Math.PI * 2
            return (
              <circle
                key={i}
                cx={Math.cos(a) * ring.r}
                cy={Math.sin(a) * ring.r}
                r={ri === 0 ? 3 : 2}
                fill="rgb(var(--c-accent))"
                opacity={0.75 - ri * 0.18}
              />
            )
          })}
        </motion.g>
      ))}
    </svg>
  )
}

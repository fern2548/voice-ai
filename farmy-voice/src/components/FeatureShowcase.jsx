import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

const reveal = {
  initial: { opacity: 0, y: 34, scale: 0.985 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
  viewport: { once: true, margin: '-100px' },
}

/**
 * บล็อกใหญ่ฝั่งซ้าย — ใช้กับฟีเจอร์เอกของ section
 * @param {{title: string, description: string, children?: React.ReactNode}} props
 */
export function PrimaryBlock({ title, description, children }) {
  return (
    <motion.div
      {...reveal}
      transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
      className="glass relative flex min-h-[440px] flex-col justify-between overflow-hidden p-10 sm:p-14"
    >
      <div>
        <h3 className="max-w-lg text-section font-semibold">{title}</h3>
        <p className="mt-6 max-w-md text-lg font-light leading-relaxed text-muted">{description}</p>
      </div>
      {children && <div className="mt-12">{children}</div>}
    </motion.div>
  )
}

/**
 * บล็อกรองฝั่งขวา — เล็กกว่าชัดเจน กดแล้วไปหน้าจริง
 * @param {{title: string, command: string, to: string, delay?: number}} props
 */
export function SecondaryBlock({ title, command, to, delay = 0 }) {
  const navigate = useNavigate()

  return (
    <motion.button
      type="button"
      onClick={() => navigate(to)}
      {...reveal}
      transition={{ duration: 0.9, delay, ease: [0.22, 0.61, 0.36, 1] }}
      whileHover={{ y: -5 }}
      className="glass group flex min-h-[206px] flex-col justify-between p-9 text-left"
    >
      <div className="flex items-start justify-between gap-4">
        <h4 className="text-2xl font-semibold tracking-tight">{title}</h4>
        <ArrowUpRight
          className="h-5 w-5 flex-shrink-0 text-faint transition-colors duration-500 group-hover:text-accent"
          strokeWidth={1.5}
        />
      </div>
      <p className="text-[15px] font-light text-muted">“{command}”</p>
    </motion.button>
  )
}

/**
 * ภาพแทน "เสียงไหลเข้าไปเป็นข้อมูลฟาร์ม"
 * เส้นเสียงทางซ้ายค่อย ๆ แตกออกเป็นจุดข้อมูลทางขวา
 */
export function VoiceToDataVisual() {
  const dots = [
    { x: 430, y: 40 },
    { x: 470, y: 76 },
    { x: 500, y: 22 },
    { x: 540, y: 62 },
    { x: 575, y: 34 },
    { x: 612, y: 70 },
  ]
  return (
    <svg viewBox="0 0 660 100" className="h-24 w-full" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="v2d" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0.85" />
          <stop offset="70%" stopColor="rgb(var(--c-iris))" stopOpacity="0.5" />
          <stop offset="100%" stopColor="rgb(var(--c-aqua))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* คลื่นเสียงต้นทาง */}
      {Array.from({ length: 26 }).map((_, i) => {
        const h = 6 + Math.abs(Math.sin(i * 0.55)) * 46
        return (
          <rect
            key={i}
            x={i * 13}
            y={50 - h / 2}
            width="2"
            height={h}
            rx="1"
            fill="url(#v2d)"
          />
        )
      })}
      {/* เส้นเชื่อมไปยังจุดข้อมูล */}
      {dots.map((d, i) => (
        <g key={i}>
          <path
            d={`M350 50 Q ${(350 + d.x) / 2} ${d.y} ${d.x} ${d.y}`}
            stroke="rgb(var(--c-line))"
            strokeWidth="1"
            opacity="0.8"
          />
          <motion.circle
            cx={d.x}
            cy={d.y}
            r="3.5"
            fill="rgb(var(--c-accent))"
            initial={{ opacity: 0.25 }}
            whileInView={{ opacity: [0.25, 1, 0.6] }}
            viewport={{ once: true }}
            transition={{ duration: 2.4, delay: 0.5 + i * 0.16, ease: 'easeOut' }}
          />
        </g>
      ))}
    </svg>
  )
}

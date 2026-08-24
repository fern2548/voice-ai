import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Activity, FileText, Syringe, Warehouse } from 'lucide-react'

const tiles = [
  { title: 'โรงเรือน', command: 'ไปหน้าโรงเรือน', to: '/barns', Icon: Warehouse },
  { title: 'สุขภาพ', command: 'ดูหมูป่วยวันนี้', to: '/health', Icon: Activity },
  { title: 'วัคซีน', command: 'บันทึกวัคซีน', to: '/vaccines', Icon: Syringe },
  { title: 'รายงาน', command: 'เปิดรายงาน', to: '/reports', Icon: FileText },
]

/** แผ่นคำสั่งขนาดใหญ่ เว้นระยะเยอะ ไม่ใส่กรอบ ใช้เส้นคั่นบางแทน */
export default function VoiceNavigation() {
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2">
      {tiles.map(({ title, command, to, Icon }, i) => (
        <motion.button
          key={to}
          type="button"
          onClick={() => navigate(to)}
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-90px' }}
          transition={{ duration: 0.9, delay: i * 0.1, ease: [0.22, 0.61, 0.36, 1] }}
          className="group relative border-b border-line/60 px-2 py-14 text-left transition-colors duration-700 hover:border-accent/50 sm:px-8"
        >
          <Icon
            className="h-6 w-6 text-faint transition-colors duration-500 group-hover:text-accent"
            strokeWidth={1.3}
          />
          <div className="mt-7 text-[clamp(30px,3.4vw,52px)] font-light leading-none tracking-tight transition-transform duration-700 group-hover:translate-x-1.5">
            {title}
          </div>
          <p className="mt-4 text-[15px] font-light text-muted">“{command}”</p>
        </motion.button>
      ))}
    </div>
  )
}

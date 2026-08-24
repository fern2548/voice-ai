import { motion } from 'framer-motion'
import { farmData } from '../data/mockFarmData.js'

const reveal = (delay) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 1, delay, ease: [0.22, 0.61, 0.36, 1] },
})

/**
 * ตัวเลขสำคัญ 3 ตัว จัดแบบ editorial 50% / 25% / 25%
 * ไม่ใช่การ์ด KPI — ตัวหลักตัวใหญ่กว่าอีกสองตัวชัดเจน
 */
export default function FarmMetrics() {
  return (
    <div className="grid grid-cols-1 gap-y-16 lg:grid-cols-2 lg:gap-x-20">
      {/* ตัวเอก กินครึ่งหนึ่ง */}
      <motion.div {...reveal(0)}>
        <div className="text-metric font-light tracking-tighter text-display-gradient">
          {farmData.pigs.toLocaleString('th-TH')}
        </div>
        <div className="mt-4 text-xl font-medium">สุกรทั้งหมด</div>
        <p className="mt-2 max-w-xs text-[15px] font-light text-muted">
          นับรวมทุกโรงเรือน อัปเดตอัตโนมัติทุกชั่วโมง
        </p>
      </motion.div>

      {/* สองตัวรอง แบ่งอีกครึ่ง */}
      <div className="grid grid-cols-1 gap-y-14 sm:grid-cols-2 sm:gap-x-12">
        <motion.div {...reveal(0.15)}>
          <div className="text-[clamp(44px,5vw,76px)] font-light leading-none tracking-tighter text-warm">
            {farmData.sickToday}
          </div>
          <div className="mt-3 text-base font-medium">สุกรป่วยวันนี้</div>
          <p className="mt-1.5 text-sm font-light text-muted">อยู่ระหว่างการรักษา</p>
        </motion.div>

        <motion.div {...reveal(0.28)}>
          <div className="text-[clamp(44px,5vw,76px)] font-light leading-none tracking-tighter text-iris">
            {farmData.alerts}
          </div>
          <div className="mt-3 text-base font-medium">การแจ้งเตือน</div>
          <p className="mt-1.5 text-sm font-light text-muted">รอการตรวจสอบ</p>
        </motion.div>
      </div>
    </div>
  )
}

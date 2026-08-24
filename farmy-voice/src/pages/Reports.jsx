import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import PageShell from '../components/PageShell.jsx'
import { reports } from '../data/mockFarmData.js'

export default function Reports() {
  return (
    <PageShell title="รายงาน" subtitle="สรุปข้อมูลฟาร์มในมุมมองต่าง ๆ พร้อมเวลาที่อัปเดตล่าสุด">
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {reports.map((r, i) => (
          <motion.article
            key={r.id}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: i * 0.08, ease: [0.22, 0.61, 0.36, 1] }}
            className="group cursor-pointer border-b border-line/60 py-12 pr-8 transition-colors duration-500 hover:border-accent/50"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-[clamp(24px,2.4vw,36px)] font-light tracking-tight transition-transform duration-700 group-hover:translate-x-1.5">
                {r.title}
              </h2>
              <ArrowUpRight
                className="h-5 w-5 flex-shrink-0 text-faint transition-colors duration-500 group-hover:text-accent"
                strokeWidth={1.5}
              />
            </div>
            <p className="mt-4 max-w-sm text-[15px] font-light leading-relaxed text-muted">
              {r.description}
            </p>
            <div className="mt-8 text-xs text-faint">อัปเดตล่าสุด · {r.updated}</div>
          </motion.article>
        ))}
      </div>
    </PageShell>
  )
}

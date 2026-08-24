import { motion } from 'framer-motion'
import PageShell from '../components/PageShell.jsx'
import { farmData, healthCases } from '../data/mockFarmData.js'

const statusStyle = {
  กำลังรักษา: 'text-warm',
  เฝ้าดูอาการ: 'text-aqua',
}

export default function Health() {
  return (
    <PageShell title="สุขภาพสุกร" subtitle="เคสป่วยที่พบในวันนี้ แยกตามโรงเรือนและสถานะการรักษา">
      <div className="mb-24 flex flex-wrap gap-x-24 gap-y-10">
        <div>
          <div className="text-[clamp(56px,7vw,110px)] font-light leading-none tracking-tighter text-warm">
            {farmData.sickToday}
          </div>
          <div className="mt-3 text-base text-muted">สุกรป่วยวันนี้</div>
        </div>
        <div>
          <div className="text-[clamp(56px,7vw,110px)] font-light leading-none tracking-tighter">
            {healthCases.length}
          </div>
          <div className="mt-3 text-base text-muted">จำนวนเคส</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {healthCases.map((c, i) => (
          <motion.article
            key={c.id}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: [0.22, 0.61, 0.36, 1] }}
            whileHover={{ y: -5 }}
            className="glass p-9"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight">{c.barn}</h2>
              <span className={`text-[13px] font-medium ${statusStyle[c.status] || 'text-muted'}`}>
                {c.status}
              </span>
            </div>

            <div className="mt-8">
              <span className="text-[44px] font-light leading-none tracking-tighter">{c.count}</span>
              <span className="ml-2 text-sm text-muted">ตัว</span>
            </div>

            <div className="mt-8 border-t border-line/60 pt-5">
              <div className="text-xs text-faint">อาการ</div>
              <div className="mt-1.5 text-[15px]">{c.symptom}</div>
            </div>
          </motion.article>
        ))}
      </div>
    </PageShell>
  )
}

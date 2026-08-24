import { motion } from 'framer-motion'
import { Droplets, Sun, Thermometer } from 'lucide-react'
import PageShell from '../components/PageShell.jsx'
import { farmData } from '../data/mockFarmData.js'

const statusStyle = {
  ปกติ: 'text-emerald-500',
  เฝ้าระวัง: 'text-warm',
}

export default function Barns() {
  return (
    <PageShell title="โรงเรือน" subtitle="ภาพรวมสภาพแวดล้อมและจำนวนสุกรในแต่ละโรงเรือน">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {farmData.barns.map((barn, i) => (
          <motion.article
            key={barn.id}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: [0.22, 0.61, 0.36, 1] }}
            whileHover={{ y: -5 }}
            className="glass p-9"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">{barn.name}</h2>
              <span className={`text-[13px] font-medium ${statusStyle[barn.status] || 'text-muted'}`}>
                {barn.status}
              </span>
            </div>

            <div className="mt-10">
              <div className="text-[56px] font-light leading-none tracking-tighter">
                {barn.pigs.toLocaleString('th-TH')}
              </div>
              <div className="mt-2 text-sm text-muted">สุกรในโรงเรือน</div>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-5 border-t border-line/60 pt-6">
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-faint">
                  <Thermometer className="h-3.5 w-3.5" strokeWidth={1.6} />
                  อุณหภูมิ
                </dt>
                <dd className="mt-1.5 text-lg font-normal">{barn.temperature}°C</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-faint">
                  <Droplets className="h-3.5 w-3.5" strokeWidth={1.6} />
                  ความชื้น
                </dt>
                <dd className="mt-1.5 text-lg font-normal">{barn.humidity}%</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-faint">
                  <Sun className="h-3.5 w-3.5" strokeWidth={1.6} />
                  แสง
                </dt>
                <dd className="mt-1.5 text-lg font-normal">{barn.light}%</dd>
              </div>
            </dl>
          </motion.article>
        ))}
      </div>
    </PageShell>
  )
}

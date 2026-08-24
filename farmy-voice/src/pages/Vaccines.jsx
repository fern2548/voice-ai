import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import PageShell from '../components/PageShell.jsx'
import { farmData, vaccineRecords } from '../data/mockFarmData.js'

const emptyForm = { date: '', barn: 'โรงเรือน 1', vaccine: '', pigs: '' }

export default function Vaccines() {
  const [records, setRecords] = useState(vaccineRecords)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.date || !form.vaccine.trim()) return
    setRecords((rs) => [
      {
        id: Date.now(),
        date: form.date,
        barn: form.barn,
        vaccine: form.vaccine.trim(),
        pigs: Number(form.pigs) || 0,
        nextDue: '—',
      },
      ...rs,
    ])
    setForm(emptyForm)
    setShowForm(false)
  }

  const field =
    'w-full rounded-2xl border border-line/70 bg-transparent px-4 py-3 text-[15px] outline-none transition-colors duration-300 focus:border-accent'

  return (
    <PageShell title="วัคซีน" subtitle="บันทึกการฉีดและดูประวัติย้อนหลังของแต่ละโรงเรือน">
      <button
        type="button"
        onClick={() => setShowForm((v) => !v)}
        className="mb-10 inline-flex items-center gap-2 rounded-full border border-line/70 px-6 py-3 text-[15px] font-medium transition-colors duration-500 hover:border-accent/60"
      >
        <Plus className="h-4 w-4" strokeWidth={1.8} />
        บันทึกวัคซีน
      </button>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
            onSubmit={submit}
            className="glass mb-10 overflow-hidden p-9"
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-2 block text-sm text-muted">วันที่ฉีด</span>
                <input type="date" value={form.date} onChange={update('date')} required className={field} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-muted">โรงเรือน</span>
                <select value={form.barn} onChange={update('barn')} className={field}>
                  {farmData.barns.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-muted">ชนิดวัคซีน</span>
                <input
                  value={form.vaccine}
                  onChange={update('vaccine')}
                  required
                  placeholder="เช่น ปากเท้าเปื่อย"
                  className={field}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-muted">จำนวนที่ฉีด</span>
                <input
                  type="number"
                  min="0"
                  value={form.pigs}
                  onChange={update('pigs')}
                  placeholder="0"
                  className={field}
                />
              </label>
            </div>
            <button
              type="submit"
              className="mt-8 rounded-full bg-accent px-7 py-3 text-sm font-medium text-white transition-opacity duration-500 hover:opacity-85"
            >
              บันทึก
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <h2 className="mb-8 text-xl font-semibold tracking-tight">ประวัติการฉีด</h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[15px]">
          <thead>
            <tr className="border-b border-line/60 text-sm text-faint">
              <th className="py-5 pr-6 font-normal">วันที่</th>
              <th className="py-5 pr-6 font-normal">โรงเรือน</th>
              <th className="py-5 pr-6 font-normal">ชนิดวัคซีน</th>
              <th className="py-5 pr-6 text-right font-normal">จำนวน</th>
              <th className="py-5 font-normal">นัดครั้งถัดไป</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-line/40 last:border-0">
                <td className="py-5 pr-6">{r.date}</td>
                <td className="py-5 pr-6 text-muted">{r.barn}</td>
                <td className="py-5 pr-6">{r.vaccine}</td>
                <td className="py-5 pr-6 text-right">{r.pigs}</td>
                <td className="py-5 text-muted">{r.nextDue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  )
}

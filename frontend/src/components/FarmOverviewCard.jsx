import { useEffect, useState } from 'react'
import { getPigHealthLog, getVaccineDue } from '../api.js'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// เส้นกราฟเล็ก ๆ (sparkline) วาดจากค่าที่ให้มา
function Sparkline({ points, color }) {
  if (!points || points.length < 2) return null
  const max = Math.max(...points)
  const min = Math.min(...points)
  const span = max - min || 1
  const d = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * 100
      const y = 26 - ((v - min) / span) * 22
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
  const lastY = 26 - ((points[points.length - 1] - min) / span) * 22
  return (
    <svg className="spark" viewBox="0 0 100 30" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="100" cy={lastY} r="2.6" fill={color} />
      <circle cx="100" cy={lastY} r="5" fill={color} opacity="0.28" />
    </svg>
  )
}

export default function FarmOverviewCard() {
  const [rows, setRows] = useState([])
  const [dueCount, setDueCount] = useState(null)

  useEffect(() => {
    getPigHealthLog({ page: 0, pageSize: 14 })
      .then((d) => setRows(Array.isArray(d?.rows) ? d.rows : []))
      .catch(() => {})
    getVaccineDue(7)
      .then((d) => setDueCount(d?.total ?? 0))
      .catch(() => {})
  }, [])

  const latest = rows[0] ?? null
  const prev = rows[1] ?? null
  const sickToday = latest?.log_date === todayStr() ? latest.sick_count : null
  // บางบันทึกไม่ได้กรอกจำนวนหมูทั้งหมดไว้ -> ถอยไปหาค่าล่าสุดที่มีจริง ไม่งั้นจะขึ้น "--" ทั้งที่รู้จำนวนอยู่
  const latestTotal = rows.find((r) => r.total_count != null)?.total_count ?? null

  // เรียงจากเก่า -> ใหม่ ให้กราฟไล่เวลาถูกทาง
  const chrono = [...rows].reverse()
  const sickSeries = chrono.map((r) => r.sick_count).filter((v) => v != null)
  const totalSeries = chrono.map((r) => r.total_count).filter((v) => v != null)

  const sickDiff = latest && prev ? latest.sick_count - prev.sick_count : null

  const stats = [
    {
      icon: 'ti-pig',
      tone: 'blue',
      label: 'จำนวนสุกรทั้งหมด',
      value: latestTotal ?? '--',
      unit: 'ตัว',
      series: totalSeries,
      color: '#60a5fa',
      note: latest ? `จากบันทึกวันที่ ${latest.log_date}` : 'ยังไม่มีบันทึก',
    },
    {
      icon: 'ti-heartbeat',
      tone: 'pink',
      label: 'หมูป่วยวันนี้',
      value: sickToday ?? '--',
      unit: 'ตัว',
      series: sickSeries,
      color: '#f472b6',
      note:
        sickToday == null
          ? latest
            ? `ยังไม่บันทึกวันนี้ · ล่าสุด ${latest.log_date}: ${latest.sick_count} ตัว`
            : 'ยังไม่มีบันทึก'
          : sickDiff == null
            ? 'ยังไม่มีข้อมูลเทียบ'
            : sickDiff > 0
              ? `เพิ่มขึ้น +${sickDiff} ตัว จากครั้งก่อน`
              : sickDiff < 0
                ? `ลดลง ${sickDiff} ตัว จากครั้งก่อน`
                : 'เท่าเดิมจากครั้งก่อน',
      noteTone: sickToday == null ? '' : sickDiff > 0 ? 'up' : sickDiff < 0 ? 'down' : '',
    },
    {
      icon: 'ti-bell',
      tone: 'amber',
      label: 'การแจ้งเตือน',
      value: dueCount ?? '--',
      unit: 'รายการ',
      series: null,
      color: '#fbbf24',
      note: dueCount ? 'ต้องตรวจสอบ' : 'ไม่มีรายการค้าง',
    },
  ]

  return (
    <div className="stat-row">
      {stats.map((s) => (
        <div key={s.label} className={`stat-card tone-${s.tone}`}>
          <div className={`stat-card-icon tone-${s.tone}`}>
            <i className={`ti ${s.icon}`} aria-hidden="true" />
          </div>
          <div className="stat-card-body">
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-figure">
              <span className={`stat-card-value tone-${s.tone}`}>{s.value}</span>
              <span className="stat-card-unit">{s.unit}</span>
            </div>
            <div className={`stat-card-note ${s.noteTone || ''}`}>{s.note}</div>
          </div>
          {s.series && s.series.length > 1 && (
            <Sparkline points={s.series} color={s.color} />
          )}
        </div>
      ))}
    </div>
  )
}

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import usePolling from '../hooks/usePolling.js'
import { getPredictionsLog } from '../api.js'
import { METRICS } from '../metrics.js'

const RANGES = [
  { hours: null, label: 'ทั้งหมด' },
  { hours: 1, label: '1 ชม.' },
  { hours: 4, label: '4 ชม.' },
  { hours: 8, label: '8 ชม.' },
  { hours: 24, label: '24 ชม.' },
]
const FETCH_SIZE = 100

const ACTUAL_COLOR = 'var(--accent-2)' // เขียว = ค่าจริง
const PRED_COLOR = 'var(--accent)' //   ฟ้า  = ค่าทำนาย

function MetricChart({ metric, rows }) {
  // แกนเวลา: predicted_for เป็น HH:MM:SS, predicted_at เป็น dd/mm/yyyy HH:MM:SS
  // ดึงเฉพาะ HH:MM ออกมาให้ label สั้นเท่ากันทั้งแกน (กันรูปแบบปนกัน)
  const data = rows.map((r) => {
    const raw = r.predicted_for ?? r.predicted_at ?? ''
    const hhmm = raw.match(/(\d{2}:\d{2})/)
    return {
      time: hhmm ? hhmm[1] : raw,
      actual: r[`${metric.key}_actual`],
      pred: r[`${metric.key}_pred`],
    }
  })

  const hasData = data.some((d) => d.actual != null || d.pred != null)

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">
          <i className={`ti ${metric.icon}`} aria-hidden="true" style={{ marginRight: 6 }} />
          {metric.label} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({metric.unit})</span>
        </span>
      </div>
      <div className="chart-wrap">
        {!hasData ? (
          <div className="empty-note">ยังไม่มีข้อมูลในช่วงนี้</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="var(--grid-line)" strokeDasharray="3 3" vertical={false} /> {/* ปรับ: ลบเส้นแนวตั้งเพื่อให้กราฟดูคลีนขึ้น */}
              <XAxis 
                dataKey="time" 
                stroke="var(--text-dim)" 
                fontSize={11} 
                tick={{ fill: 'var(--text-dim)' }} 
                minTickGap={24} 
              />
              <YAxis 
                stroke="var(--text-dim)" 
                fontSize={11} 
                tick={{ fill: 'var(--text-dim)' }} 
                domain={['auto', 'auto']} 
              />
              <Tooltip
                contentStyle={{ background: 'var(--panel-3)', border: '1px solid var(--border)', borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />

              {/* ปรับค่าจริง: เส้นทึบ เส้นหนาขึ้นเล็กน้อย */}
              <Line 
                type="monotone" 
                dataKey="actual" 
                name="ค่าจริง" 
                stroke={ACTUAL_COLOR} 
                strokeWidth={3} 
                dot={{ r: 2, fill: ACTUAL_COLOR, strokeWidth: 0 }} // เพิ่มจุดเล็กๆ
                activeDot={{ r: 5 }} 
                isAnimationActive={false} 
                connectNulls 
              />

              {/* ปรับค่าทำนาย: เส้นประ บางลง และโปร่งแสงขึ้น */}
              <Line 
                type="monotone" 
                dataKey="pred" 
                name="ค่าทำนาย" 
                stroke={PRED_COLOR} 
                strokeWidth={2} 
                strokeDasharray="6 6" // ปรับจังหวะเส้นประให้ห่างขึ้น
                dot={false} 
                activeDot={{ r: 5 }}
                isAnimationActive={false} 
                connectNulls 
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default function TrendComparePage() {
  const [hours, setHours] = useState(24)
  const { data, updatedAt, error } = usePolling(
    () => getPredictionsLog({ page: 0, pageSize: FETCH_SIZE, hours }),
    60000,
    `${hours}`
  )
  // predictions-log คืน desc (ใหม่->เก่า) กลับด้านให้กราฟไล่เวลา เก่า->ใหม่
  const rows = Array.isArray(data?.rows) ? [...data.rows].reverse() : []

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">แนวโน้ม ค่าจริง vs ค่าทำนาย · TREND COMPARISON</span>
          <div className="range-bar">
            {RANGES.map((r) => (
              <button
                key={r.label}
                className={`range-btn ${hours === r.hours ? 'on' : ''}`}
                onClick={() => setHours(r.hours)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="panel-foot">
          {error
            ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — แสดงข้อมูลล่าสุดที่ดึงได้'
            : rows.length > 0
              ? `${rows.length} จุดข้อมูล` + (updatedAt ? ' · อัปเดต ' + updatedAt.toLocaleTimeString('th-TH') : '')
              : 'อัปเดตทุก 1 นาที'}
        </div>
      </div>

      {METRICS.map((m) => (
        <MetricChart key={m.key} metric={m} rows={rows} />
      ))}
    </>
  )
}

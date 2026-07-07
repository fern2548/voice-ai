import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import usePolling from '../../hooks/usePolling.js'
import { getHistory } from '../../api.js'
import { METRICS } from '../../metrics.js'

const SERIES_COLORS = {
  temperature: '#ff6b6b',
  humidity: '#4da6ff',
  windspeed: '#00e0b0',
  rainfall: '#a78bfa',
  light: '#ffc857',
}

export default function TrendChart() {
  const { data, updatedAt } = usePolling(getHistory, 60000)
  const rows = data ?? []
  const [active, setActive] = useState('temperature')

  const metric = METRICS.find((m) => m.key === active)

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">แนวโน้มย้อนหลัง 1 ชั่วโมง · TREND</span>
        <div className="chip-row">
          {METRICS.map((m) => (
            <button
              key={m.key}
              className={`chip ${active === m.key ? 'chip-on' : ''}`}
              onClick={() => setActive(m.key)}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-wrap">
        {rows.length === 0 ? (
          <div className="empty-note">กำลังโหลดข้อมูล…</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={rows} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="var(--grid-line)" strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                stroke="var(--text-dim)"
                fontSize={12}
                tick={{ fill: 'var(--text-dim)' }}
              />
              <YAxis
                stroke="var(--text-dim)"
                fontSize={12}
                tick={{ fill: 'var(--text-dim)' }}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--panel-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                }}
                labelStyle={{ color: 'var(--text-dim)' }}
              />
              <Line
                type="monotone"
                dataKey={active}
                name={`${metric.label} (${metric.unit})`}
                stroke={SERIES_COLORS[active]}
                strokeWidth={2.5}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="panel-foot">
        {updatedAt
          ? 'อัปเดตล่าสุด: ' + updatedAt.toLocaleTimeString('th-TH')
          : 'อัปเดตทุก 1 นาที'}
      </div>
    </div>
  )
}

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CloudRain, Droplets, Thermometer, Wind } from 'lucide-react'
import PageShell from '../components/PageShell.jsx'
import { weatherNow, weatherTrend } from '../data/mockFarmData.js'

const metrics = [
  { label: 'อุณหภูมิ', value: `${weatherNow.temperature}°C`, Icon: Thermometer },
  { label: 'ความชื้น', value: `${weatherNow.humidity}%`, Icon: Droplets },
  { label: 'ลม', value: `${weatherNow.wind} กม./ชม.`, Icon: Wind },
  { label: 'โอกาสฝนตก', value: `${weatherNow.rainChance}%`, Icon: CloudRain },
]

export default function Weather() {
  return (
    <PageShell title="พยากรณ์อากาศ" subtitle={`สภาพอากาศรอบฟาร์มตอนนี้ · ${weatherNow.condition}`}>
      <div className="grid grid-cols-2 gap-x-12 gap-y-10 sm:grid-cols-4">
        {metrics.map(({ label, value, Icon }) => (
          <div key={label} className="border-t border-line/60 pt-6">
            <div className="flex items-center gap-1.5 text-sm text-muted">
              <Icon className="h-4 w-4" strokeWidth={1.6} />
              {label}
            </div>
            <div className="mt-2 text-[clamp(30px,3.4vw,48px)] font-light leading-none tracking-tighter">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-24">
        <h2 className="text-xl font-semibold tracking-tight">อุณหภูมิรายชั่วโมง</h2>
        <p className="mt-2 text-sm font-light text-muted">ข้อมูลวันนี้ 06:00 – 20:00</p>

        <div className="mt-10 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weatherTrend} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="wt-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: 'rgb(var(--c-faint))' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: 'rgb(var(--c-faint))' }}
                domain={['dataMin - 2', 'dataMax + 2']}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 16,
                  border: '1px solid rgb(var(--c-line))',
                  background: 'rgb(var(--c-raised))',
                  color: 'rgb(var(--c-fg))',
                  fontSize: 13,
                }}
                labelStyle={{ color: 'rgb(var(--c-muted))' }}
                formatter={(v) => [`${v}°C`, 'อุณหภูมิ']}
              />
              <Area
                type="monotone"
                dataKey="temp"
                stroke="rgb(var(--c-accent))"
                strokeWidth={2}
                fill="url(#wt-fill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PageShell>
  )
}

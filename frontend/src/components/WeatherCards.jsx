import usePolling from '../hooks/usePolling.js'
import { getWeather } from '../api.js'

const CARDS = [
  { key: 'temperature', icon: '🌡️', label: 'อุณหภูมิ', unit: '°C' },
  { key: 'humidity', icon: '💧', label: 'ความชื้น', unit: '%' },
  { key: 'windspeed', icon: '💨', label: 'ความเร็วลม', unit: 'm/s' },
  { key: 'rainfall', icon: '🌧️', label: 'ฝน', unit: 'mm' },
  { key: 'light', icon: '☀️', label: 'แสง', unit: 'lux' },
]

export default function WeatherCards() {
  const { data, updatedAt } = usePolling(getWeather, 30000)

  return (
    <>
      <div className="grid">
        {CARDS.map((c) => (
          <div className="card" key={c.key}>
            <div className="icon">{c.icon}</div>
            <div className="label">{c.label}</div>
            <div className="value">{data?.[c.key] ?? '--'}</div>
            <div className="unit">{c.unit}</div>
          </div>
        ))}
      </div>
      <div className="status">
        {updatedAt
          ? 'อัปเดตล่าสุด: ' + updatedAt.toLocaleTimeString('th-TH')
          : 'อัปเดตข้อมูลทุก 30 วินาที'}
      </div>
    </>
  )
}

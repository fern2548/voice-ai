import usePolling from '../../hooks/usePolling.js'
import { getWeather } from '../../api.js'
import { METRICS, levelOf } from '../../metrics.js'

export default function MetricGauges() {
  const { data, updatedAt } = usePolling(getWeather, 30000)

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">ค่าตรวจวัดปัจจุบัน · REAL-TIME</span>
        <span className="reading-time">
          {data?.reading_time ? `⏱ ข้อมูล ณ ${data.reading_time}` : 'กำลังโหลด…'}
        </span>
        <span className="panel-tag">LIVE</span>
      </div>
      <div className="metric-grid">
        {METRICS.map((m) => {
          const v = data?.[m.key] ?? null
          const level = levelOf(m, v)
          return (
            <div className={`metric-cell lv-${level}`} key={m.key}>
              <div className={`status-led led-${level}`} />
              <div className="metric-icon">{m.icon}</div>
              <div className="metric-label">{m.label}</div>
              <div className="metric-value">
                {v ?? '--'}
                <span className="metric-unit">{m.unit}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="panel-foot">
        {updatedAt
          ? 'ดึงข้อมูลล่าสุด: ' + updatedAt.toLocaleTimeString('th-TH')
          : 'อัปเดตทุก 30 วินาที'}
      </div>
    </div>
  )
}

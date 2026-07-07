import { useLiveData } from '../../context/LiveData.jsx'
import { METRICS, levelOf } from '../../metrics.js'
import { isStale } from '../../utils/sensorStatus.js'

export default function MetricGauges() {
  const { weather: data, weatherUpdatedAt: updatedAt } = useLiveData()
  const stale = isStale(data?.reading_time)

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">ค่าตรวจวัดปัจจุบัน · REAL-TIME</span>
        <span className={`reading-time ${stale ? 'stale' : ''}`}>
          {data?.reading_time ? (
            <><i className={`ti ${stale ? 'ti-alert-triangle' : 'ti-clock'}`} aria-hidden="true" style={{ marginRight: 5 }} />ข้อมูล ณ {data.reading_time}{stale ? ' · ไม่มีข้อมูลใหม่' : ''}</>
          ) : 'กำลังโหลด…'}
        </span>
        <span className="panel-tag">LIVE</span>
      </div>
      <div className="metric-grid">
        {METRICS.map((m) => {
          const v = stale ? null : (data?.[m.key] ?? null)
          const level = levelOf(m, v)
          return (
            <div className={`metric-cell lv-${level}`} key={m.key}>
              <div className={`status-led led-${level}`} />
              <div className="metric-icon"><i className={`ti ${m.icon}`} aria-hidden="true" /></div>
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

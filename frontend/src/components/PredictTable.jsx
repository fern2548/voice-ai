import usePolling from '../hooks/usePolling.js'
import { getPredict } from '../api.js'

export default function PredictTable() {
  const { data, updatedAt } = usePolling(getPredict, 1800000) // 30 นาที
  const rows = Array.isArray(data) ? data : []
  const hasForecast = rows.length > 1
  const isEstimate = rows.some((r) => r.is_estimate)
  const isLive = hasForecast && !isEstimate

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">ตารางพยากรณ์ล่วงหน้า · FORECAST</span>
        {isEstimate && (
          <span className="panel-tag est" title="ยังไม่ได้เชื่อมต่อโมเดล LSTM จริง (Node-RED/Jetson Nano) แสดงค่าประมาณเชิงเส้นแทน">
            <i className="ti ti-alert-triangle" aria-hidden="true" /> ค่าประมาณ
          </span>
        )}
        {isLive && (
          <span className="panel-tag live" title="ใช้ผลทำนายจากโมเดล LSTM จริง">
            <span className="panel-tag-dot" /> LSTM LIVE
          </span>
        )}
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>เวลา</th>
              <th><i className="ti ti-temperature" aria-hidden="true" /> อุณหภูมิ<span className="th-unit">°C</span></th>
              <th><i className="ti ti-droplet" aria-hidden="true" /> ความชื้น<span className="th-unit">%</span></th>
              <th><i className="ti ti-wind" aria-hidden="true" /> ลม<span className="th-unit">m/s</span></th>
              <th><i className="ti ti-cloud-rain" aria-hidden="true" /> ฝน<span className="th-unit">mm</span></th>
              <th><i className="ti ti-sun" aria-hidden="true" /> แสง<span className="th-unit">lux</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="6" className="td-empty">กำลังโหลด…</td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx} className={row.is_now ? 'now-row' : ''}>
                  <td>{row.is_now ? `${row.hour} ● ปัจจุบัน` : row.hour}</td>
                  <td>{row.temperature ?? '--'}</td>
                  <td>{row.humidity ?? '--'}</td>
                  <td>{row.windspeed ?? '--'}</td>
                  <td>{row.rainfall ?? '--'}</td>
                  <td>{row.light ?? '--'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="panel-foot">
        {updatedAt
          ? 'อัปเดตล่าสุด: ' + updatedAt.toLocaleTimeString('th-TH')
          : 'อัปเดตทุก 30 นาที'}
      </div>
    </div>
  )
}

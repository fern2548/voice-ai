import usePolling from '../hooks/usePolling.js'
import { getPredict } from '../api.js'

export default function PredictTable() {
  const { data, updatedAt } = usePolling(getPredict, 1800000) // 30 นาที
  const rows = data ?? []

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">ตารางพยากรณ์ล่วงหน้า · FORECAST</span>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>เวลา</th>
              <th>🌡️ อุณหภูมิ<span className="th-unit">°C</span></th>
              <th>💧 ความชื้น<span className="th-unit">%</span></th>
              <th>💨 ลม<span className="th-unit">m/s</span></th>
              <th>🌧️ ฝน<span className="th-unit">mm</span></th>
              <th>☀️ แสง<span className="th-unit">lux</span></th>
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

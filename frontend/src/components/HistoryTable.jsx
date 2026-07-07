import usePolling from '../hooks/usePolling.js'
import { getHistory } from '../api.js'

export default function HistoryTable() {
  const { data, updatedAt } = usePolling(getHistory, 300000) // 5 นาที
  const rows = data ?? []

  return (
    <div className="predict-box">
      <h2>🕐 ข้อมูลย้อนหลัง 1 ชั่วโมง</h2>
      <div style={{ overflowX: 'auto' }}>
        <table id="predictTable">
          <thead>
            <tr>
              <th>เวลา</th>
              <th>🌡️ อุณหภูมิ (°C)</th>
              <th>💧 ความชื้น (%)</th>
              <th>💨 ลม (m/s)</th>
              <th>🌧️ ฝน (mm)</th>
              <th>☀️ แสง (lux)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>กำลังโหลด...</td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx} className={idx === rows.length - 1 ? 'now-row' : ''}>
                  <td>{row.time ?? '--'}</td>
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
      <div className="status">
        {updatedAt
          ? 'อัปเดตล่าสุด: ' + updatedAt.toLocaleTimeString('th-TH')
          : 'อัปเดตทุก 5 นาที'}
      </div>
    </div>
  )
}

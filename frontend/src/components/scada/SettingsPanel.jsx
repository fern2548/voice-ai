import { useTheme } from '../../theme.jsx'

export default function SettingsPanel() {
  const { theme, setTheme } = useTheme()

  const options = [
    { id: 'dark', label: 'Dark Industrial', desc: 'พื้นเข้ม เหมาะห้องควบคุม', swatch: '#0a0e14' },
    { id: 'light', label: 'Light Control Room', desc: 'พื้นสว่าง เหมาะกลางวัน', swatch: '#eef2f6' },
  ]

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">ตั้งค่าระบบ · SETTINGS</span>
      </div>

      <div className="settings-section">
        <div className="settings-label">ธีมการแสดงผล</div>
        <div className="theme-options">
          {options.map((o) => (
            <button
              key={o.id}
              className={`theme-option ${theme === o.id ? 'sel' : ''}`}
              onClick={() => setTheme(o.id)}
            >
              <span className="theme-swatch" style={{ background: o.swatch }} />
              <span className="theme-opt-text">
                <span className="theme-opt-name">{o.label}</span>
                <span className="theme-opt-desc">{o.desc}</span>
              </span>
              {theme === o.id && <span className="theme-check">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-label">ข้อมูลระบบ</div>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-k">แหล่งข้อมูล</span>
            <span className="info-v">MQTT · farm/weather/node1</span>
          </div>
          <div className="info-item">
            <span className="info-k">ฐานข้อมูล</span>
            <span className="info-v">Supabase (Postgres)</span>
          </div>
          <div className="info-item">
            <span className="info-k">โมเดลทำนาย</span>
            <span className="info-v">LSTM (NumPy) · Jetson Nano</span>
          </div>
          <div className="info-item">
            <span className="info-k">รอบอัปเดตเซนเซอร์</span>
            <span className="info-v">ทุก 1 นาที</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ตัวอย่างสถานะฟาร์มวันนี้ — ยังไม่มีระบบติดตามน้ำหนัก/อาหาร/น้ำจริง (รอต่อ backend ทีหลัง)
const STATS = [
  { icon: 'ti-heart-rate-monitor', k: 'อัตราการรอดชีวิต', v: '96.5%', note: 'ดีมาก', color: 'var(--accent-2)' },
  { icon: 'ti-scale', k: 'น้ำหนักเฉลี่ย', v: '78.4 kg', note: 'เพิ่มขึ้น +1.2 kg', color: 'var(--accent)' },
  { icon: 'ti-meat', k: 'อาหารที่ใช้วันนี้', v: '320 kg', note: 'ปกติ', color: 'var(--warn)' },
  { icon: 'ti-droplet', k: 'น้ำที่ใช้วันนี้', v: '1,240 L', note: 'ปกติ', color: '#3fa9f5' },
]

export default function FarmStatusStrip() {
  return (
    <div className="panel farm-status-strip">
      <div className="farm-status-head">
        <span className="panel-title">สถานะฟาร์มวันนี้</span>
        <span className="side-card-demo-tag">ตัวอย่าง</span>
      </div>
      <div className="farm-status-body">
        <div className="farm-status-stats">
          {STATS.map((s) => (
            <div key={s.k} className="farm-status-stat">
              <i className={`ti ${s.icon}`} aria-hidden="true" style={{ color: s.color }} />
              <div>
                <div className="farm-status-v">{s.v}</div>
                <div className="farm-status-k">{s.k}</div>
                <div className="farm-status-note">{s.note}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="farm-status-illust" aria-hidden="true">🐖🐖🐖</div>
      </div>
    </div>
  )
}

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

// ตัวอย่างข้อมูล — ยังไม่มีระบบติดตามกลุ่มอายุหมูจริงในระบบ (รอต่อ backend ทีหลัง)
const GROUPS = [
  { name: 'อนุบาล 1 (0-30 วัน)', value: 64, color: '#22c55e' },
  { name: 'อนุบาล 2 (31-60 วัน)', value: 72, color: '#8b5cf6' },
  { name: 'รุ่น 1 (61-90 วัน)', value: 60, color: '#f87171' },
  { name: 'รุ่น 2 (91+ วัน)', value: 60, color: '#f59e0b' },
]

export default function PigGroupsCard() {
  const total = GROUPS.reduce((s, g) => s + g.value, 0)

  return (
    <div className="side-card">
      <div className="side-card-head-row">
        <div className="side-card-head">กลุ่มหมูในฟาร์ม</div>
        <span className="side-card-demo-tag">ตัวอย่าง</span>
      </div>
      <div className="pig-groups-body">
        <div className="pig-groups-chart">
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={GROUPS}
                dataKey="value"
                innerRadius={38}
                outerRadius={60}
                paddingAngle={2}
                isAnimationActive={false}
              >
                {GROUPS.map((g) => (
                  <Cell key={g.name} fill={g.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--panel-3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pig-groups-total">
            <div className="pig-groups-total-v">{total}</div>
            <div className="pig-groups-total-k">ตัว</div>
          </div>
        </div>
        <div className="pig-groups-legend">
          {GROUPS.map((g) => (
            <div key={g.name} className="pig-groups-legend-item">
              <span className="pig-groups-dot" style={{ background: g.color }} />
              <span className="pig-groups-legend-name">{g.name}</span>
              <span className="pig-groups-legend-v">{g.value} ตัว</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

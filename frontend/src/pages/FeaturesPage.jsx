import { useNavigate } from 'react-router-dom'
import usePolling from '../hooks/usePolling.js'
import useReveal from '../hooks/useReveal.js'
import { getPigHealthLog, getVaccineDue } from '../api.js'

/**
 * หน้า "ทำอะไรได้บ้าง" — ยกโครงมาจากเว็บ Farmy Voice (5174) ทั้ง 6 section
 * ต่างกันตรงที่ตัวเลขในหน้านี้ดึงจากฐานข้อมูลจริง ไม่ใช่ค่าสมมติ
 *
 * แต่ละ section คือหนึ่งสไลด์ของการเปิดตัว เว้นระยะห่างเยอะ ๆ
 */

const todayStr = () => new Date().toLocaleDateString('sv-SE')   // sv-SE ให้รูปแบบ YYYY-MM-DD

function Section({ children, className = '' }) {
  return <section className={`ft-section ${className}`}>{children}</section>
}

/* ---------- 1. เสียงเดียว ครอบคลุมทั้งฟาร์ม ---------- */
function VoiceControlSection() {
  const navigate = useNavigate()
  const head = useReveal()
  const big = useReveal()
  const s1 = useReveal()
  const s2 = useReveal()

  return (
    <Section>
      <div ref={head} className="reveal ft-head">
        <p className="ft-eyebrow">One voice. Your whole farm.</p>
        <h2 className="ft-statement">เสียงเดียว ครอบคลุมทั้งฟาร์ม</h2>
      </div>

      <div className="ft-bento">
        <article ref={big} className="reveal ft-card ft-card-lg">
          <div>
            <h3 className="ft-card-title-lg">แค่พูด ก็เข้าถึงทั้งฟาร์ม</h3>
            <p className="ft-card-desc">
              ดูข้อมูลโรงเรือน สุขภาพสุกร วัคซีน และรายงานได้ทันที
            </p>
          </div>
          <VoiceToDataVisual />
        </article>

        <div className="ft-bento-side">
          <button ref={s1} className="reveal ft-card ft-card-sm" onClick={() => navigate('/pig-log')}>
            <div className="ft-card-sm-head">
              <h4>ไปหน้าโรงเรือน</h4>
              <i className="ti ti-arrow-up-right" aria-hidden="true" />
            </div>
            <p className="ft-cmd">“พาไปหน้าโรงเรือน 3”</p>
          </button>

          <button ref={s2} className="reveal ft-card ft-card-sm" onClick={() => navigate('/history')}>
            <div className="ft-card-sm-head">
              <h4>เปิดรายงาน</h4>
              <i className="ti ti-arrow-up-right" aria-hidden="true" />
            </div>
            <p className="ft-cmd">“เปิดรายงานวันนี้”</p>
          </button>
        </div>
      </div>
    </Section>
  )
}

/** ภาพแทน "เสียงไหลเข้าไปเป็นข้อมูลฟาร์ม" */
function VoiceToDataVisual() {
  const dots = [
    { x: 430, y: 40 }, { x: 470, y: 76 }, { x: 500, y: 22 },
    { x: 540, y: 62 }, { x: 575, y: 34 }, { x: 612, y: 70 },
  ]
  return (
    <svg viewBox="0 0 660 100" className="ft-visual" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ft-v2d" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.85" />
          <stop offset="70%" stopColor="var(--neon-purple)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: 26 }).map((_, i) => {
        const h = 6 + Math.abs(Math.sin(i * 0.55)) * 46
        return <rect key={i} x={i * 13} y={50 - h / 2} width="2" height={h} rx="1" fill="url(#ft-v2d)" />
      })}
      {dots.map((d, i) => (
        <g key={i}>
          <path d={`M350 50 Q ${(350 + d.x) / 2} ${d.y} ${d.x} ${d.y}`} stroke="var(--border)" strokeWidth="1" />
          <circle cx={d.x} cy={d.y} r="3.5" fill="var(--accent)" opacity="0.75" />
        </g>
      ))}
    </svg>
  )
}

/* ---------- 2. ฟาร์มของคุณ พูดกับคุณได้ (ตัวเลขจริง) ---------- */
function FarmIntelligenceSection() {
  const head = useReveal()
  const m1 = useReveal()
  const m2 = useReveal()
  const m3 = useReveal()

  const { data: healthLog } = usePolling(() => getPigHealthLog({ page: 0, pageSize: 14 }), 60000)
  const { data: due } = usePolling(() => getVaccineDue(7), 60000)

  // รูปแบบที่ backend ส่งมาจริง: /pig-health-log -> { rows: [...] } , /vaccine-due -> { rows: [...], total: N }
  const rows = Array.isArray(healthLog?.rows) ? healthLog.rows : []
  const latest = rows[0] ?? null
  // บางบันทึกไม่ได้กรอกจำนวนหมูทั้งหมด -> ถอยไปหาค่าล่าสุดที่มีจริง ไม่งั้นจะขึ้น "—" ทั้งที่รู้จำนวนอยู่
  const totalPigs = rows.find((r) => r.total_count != null)?.total_count ?? null
  const sickToday = latest?.log_date === todayStr() ? latest.sick_count : null
  const alerts = due?.total ?? null

  const show = (v) => (v == null ? '—' : Number(v).toLocaleString('th-TH'))

  return (
    <Section>
      <div ref={head} className="reveal ft-head">
        <p className="ft-eyebrow">Farm intelligence</p>
        <h2 className="ft-statement">ฟาร์มของคุณ พูดกับคุณได้</h2>
      </div>

      <div className="ft-metrics">
        <div ref={m1} className="reveal ft-metric-main">
          <div className="ft-metric-big">{show(totalPigs)}</div>
          <div className="ft-metric-label">สุกรทั้งหมด</div>
          <p className="ft-metric-hint">นับรวมทุกโรงเรือน จากบันทึกล่าสุด</p>
        </div>

        <div className="ft-metrics-side">
          <div ref={m2} className="reveal">
            <div className="ft-metric-mid warn">{show(sickToday)}</div>
            <div className="ft-metric-label sm">สุกรป่วยวันนี้</div>
            <p className="ft-metric-hint">{sickToday == null ? 'ยังไม่ได้บันทึกวันนี้' : 'อยู่ระหว่างการรักษา'}</p>
          </div>
          <div ref={m3} className="reveal">
            <div className="ft-metric-mid iris">{show(alerts)}</div>
            <div className="ft-metric-label sm">การแจ้งเตือน</div>
            <p className="ft-metric-hint">วัคซีนถึงกำหนดใน 7 วัน</p>
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ---------- 3. Local AI ---------- */
function LocalAISection() {
  const left = useReveal()
  const t1 = useReveal()
  const t2 = useReveal()

  return (
    <Section className="ft-split">
      <div ref={left} className="reveal ft-split-left">
        <p className="ft-eyebrow">Local AI</p>
        <h2 className="ft-statement">รู้ทุกอย่างที่เกิดขึ้นในฟาร์ม</h2>
        <p className="ft-lead">ข้อมูลภายในฟาร์มของคุณ โดยไม่ต้องค้นหาเอง</p>
      </div>

      <div className="ft-split-right">
        <div ref={t1} className="reveal ft-turn user">
          <div className="ft-turn-who">คุณ</div>
          <p className="ft-turn-user">“โรงเรือน 3 มีหมูป่วยกี่ตัว”</p>
        </div>
        <div ref={t2} className="reveal ft-turn">
          <div className="ft-turn-who brand">Farmy Voice</div>
          <p className="ft-turn-bot">ตอบจากบันทึกจริงในฟาร์มของคุณทันที</p>
        </div>
      </div>
    </Section>
  )
}

/* ---------- 4. Gemini AI ---------- */
function GeminiSection() {
  const right = useReveal()
  const questions = ['PRRS คืออะไร?', 'ป้องกัน ASF อย่างไร?', 'Biosecurity ที่ดีควรทำอะไรบ้าง?']

  return (
    <Section className="ft-split reverse">
      <div className="ft-split-left ft-field-wrap">
        <DataField />
      </div>

      <div ref={right} className="reveal ft-split-right">
        <p className="ft-eyebrow">Gemini AI</p>
        <h2 className="ft-statement">ถามได้มากกว่าข้อมูลในฟาร์ม</h2>
        <p className="ft-lead">เชื่อมต่อความรู้ภายนอก เพื่อช่วยคุณตัดสินใจ</p>
        <ul className="ft-qlist">
          {questions.map((q) => <li key={q}>“{q}”</li>)}
        </ul>
      </div>
    </Section>
  )
}

/** สนามข้อมูลที่แผ่ออก — แทนความรู้ภายนอกที่เชื่อมเข้ามา */
function DataField() {
  const rings = [{ r: 96, n: 6 }, { r: 158, n: 10 }, { r: 224, n: 14 }]
  return (
    <svg className="ft-field" viewBox="-280 -280 560 560" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="ft-core">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r="120" fill="url(#ft-core)" />
      {rings.map((ring, ri) => (
        <g key={ri} className={`ft-ring ${ri % 2 ? 'rev' : ''}`}>
          <circle r={ring.r} stroke="var(--border)" strokeWidth="1" fill="none" opacity="0.6" />
          {Array.from({ length: ring.n }).map((_, i) => {
            const a = (i / ring.n) * Math.PI * 2
            return (
              <circle key={i} cx={Math.cos(a) * ring.r} cy={Math.sin(a) * ring.r}
                r={ri === 0 ? 3 : 2} fill="var(--accent)" opacity={0.75 - ri * 0.18} />
            )
          })}
        </g>
      ))}
    </svg>
  )
}

/* ---------- 5. คำสั่งเสียง ---------- */
function NavigationSection() {
  const navigate = useNavigate()
  const head = useReveal()
  const tiles = [
    { title: 'โรงเรือน', cmd: 'ไปหน้าโรงเรือน', to: '/pig-log', icon: 'ti-building-warehouse' },
    { title: 'สุขภาพ', cmd: 'ดูหมูป่วยวันนี้', to: '/pig-log', icon: 'ti-activity' },
    { title: 'วัคซีน', cmd: 'บันทึกวัคซีน', to: '/vaccine', icon: 'ti-vaccine' },
    { title: 'รายงาน', cmd: 'เปิดรายงาน', to: '/history', icon: 'ti-file-text' },
  ]

  return (
    <Section>
      <div ref={head} className="reveal ft-head">
        <p className="ft-eyebrow">Voice navigation</p>
        <h2 className="ft-statement">ไม่ต้องหาเมนู แค่บอก Farmy Voice</h2>
      </div>

      <div className="ft-tiles">
        {tiles.map((t) => (
          <button key={t.title + t.to} className="ft-tile" onClick={() => navigate(t.to)}>
            <i className={`ti ${t.icon}`} aria-hidden="true" />
            <div className="ft-tile-title">{t.title}</div>
            <p className="ft-cmd">“{t.cmd}”</p>
          </button>
        ))}
      </div>
    </Section>
  )
}

/* ---------- 6. สไลด์ปิด ---------- */
function FinalCTASection() {
  const navigate = useNavigate()
  const box = useReveal()

  return (
    <Section className="ft-final">
      <div ref={box} className="reveal ft-final-inner">
        <h2 className="ft-statement center">
          ทุกข้อมูลในฟาร์ม<br />เริ่มต้นจากเสียงของคุณ
        </h2>
        <button className="ft-final-btn" onClick={() => navigate('/overview')}>
          เริ่มคุยกับ Farmy Voice
        </button>
      </div>
    </Section>
  )
}

export default function FeaturesPage() {
  return (
    <div className="ft-page">
      <VoiceControlSection />
      <FarmIntelligenceSection />
      <LocalAISection />
      <GeminiSection />
      <NavigationSection />
      <FinalCTASection />
    </div>
  )
}

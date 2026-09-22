import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getVaccineHistory, getVaccineSchedule } from '../api.js'
import { useVoiceAI } from '../context/VoiceAI.jsx'
import { useAdminAuth } from '../context/AdminAuth.jsx'
import { ROUTE_LABEL, VACCINES, findVaccine } from '../data/vaccineCatalog.js'

// หน้า "ข้อมูลวัคซีนสุกร" — สรุปวัคซีน 1 ตัวแบบดูปุ๊บรู้: ฉีดยังไง กี่มล. ซ้ำเมื่อไหร่ กำหนดการ สิ่งที่ควรรู้
// ผสมข้อมูล 2 แหล่ง: แคตตาล็อก (data/vaccineCatalog.js) + ของจริงจากฐานข้อมูล (ฉีดล่าสุด / รอบที่ตั้งไว้)

const fmtDate = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

function Stat({ icon, big, small }) {
  return (
    <div className="vi-stat">
      <span className="vi-stat-icon"><i className={`ti ${icon}`} aria-hidden="true" /></span>
      <div>
        <div className="vi-stat-big">{big}</div>
        {small && <div className="vi-stat-small">{small}</div>}
      </div>
    </div>
  )
}

export default function VaccineInfoPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { ask } = useVoiceAI()
  const { isAdmin } = useAdminAuth()
  const [schedule, setSchedule] = useState([])
  const [history, setHistory] = useState([])
  const [imgOk, setImgOk] = useState(true)

  const v = VACCINES.find((x) => x.id === params.get('v')) || VACCINES[0]
  const pick = (id) => setParams({ v: id }, { replace: true })

  // บันทึกจริงของฟาร์มเป็นข้อมูลภายใน — ดึงเฉพาะตอนล็อกอิน
  useEffect(() => {
    if (!isAdmin) return
    let alive = true
    getVaccineSchedule().then((d) => alive && setSchedule(d?.rows || [])).catch(() => {})
    getVaccineHistory({ pageSize: 100 }).then((d) => alive && setHistory(d?.rows || [])).catch(() => {})
    return () => { alive = false }
  }, [isAdmin])
  useEffect(() => { setImgOk(true) }, [v.id])

  // ของจริงจากฐานข้อมูล: รอบที่ตั้งไว้ในระบบ + ครั้งล่าสุดที่ฉีดวัคซีนตัวนี้
  const live = useMemo(() => {
    const rule = schedule.find((r) => findVaccine(r.vaccine_name)?.id === v.id)
    const last = history.find((r) => findVaccine(r.vaccine_name)?.id === v.id)
    return { rule, last }
  }, [schedule, history, v.id])

  const repeatText = v.repeat || (live.rule ? `ทุก ${live.rule.interval_days} วัน` : null)
  const routeLabel = ROUTE_LABEL[v.route] || v.route

  const askAI = () => {
    window.dispatchEvent(new Event('farmy:chat-open'))
    ask(`วัคซีน${v.name} ฉีดยังไง ฉีดซ้ำเมื่อไหร่ มีอะไรต้องระวัง`)
  }

  return (
    <div className="vi">
      {/* หัวเรื่อง + หมู */}
      <header className="vi-head">
        <div className="vi-head-text">
          <div className="vi-crumb"><Link to="/overview">หน้าแรก</Link> › ข้อมูลวัคซีนสุกร</div>
          <div className="vi-head-row">
            <span className="vi-head-icon"><i className="ti ti-vaccine" aria-hidden="true" /></span>
            <div>
              <h1 className="vi-title">ข้อมูลวัคซีนสุกร</h1>
              <div className="vi-name">{v.fullName}</div>
              <div className="vi-sub">ข้อมูลสำคัญแบบย่อ เพื่อใช้งานได้ง่าย</div>
            </div>
          </div>
        </div>
        <div className="vi-pig">
          <div className="vi-bubble">ดูแลสุกร<br />ให้แข็งแรง<br />ไปด้วยกันนะครับ</div>
          <img src="/guide/piglet.webp" alt="" className="vi-pig-img" />
        </div>
      </header>

      {/* เลือกวัคซีน */}
      <div className="chip-row vi-pick">
        {VACCINES.map((x) => (
          <button key={x.id} className={`chip ${x.id === v.id ? 'chip-on' : ''}`} onClick={() => pick(x.id)}>{x.name}</button>
        ))}
      </div>

      {/* 3 ตัวเลขใหญ่ */}
      <div className="vi-stats">
        <Stat icon="ti-vaccine" big={routeLabel} small={`(${v.route})`} />
        <Stat icon="ti-droplet" big={v.dose || 'ยึดตามฉลาก'} small={v.dose ? null : 'ปริมาณต่อตัว'} />
        <Stat icon="ti-calendar-repeat" big={repeatText ? `ฉีดซ้ำ${repeatText}` : 'ยึดตามฉลาก'} small={!v.repeat && live.rule ? 'จากกำหนดในระบบ' : null} />
      </div>

      {/* 3 การ์ด */}
      <div className="vi-cards">
        <div className="vi-card">
          <div className="vi-card-head"><i className="ti ti-flask" aria-hidden="true" /> รูปวัคซีน</div>
          <div className="vi-bottle">
            {imgOk ? (
              <img src={v.image} alt={`ขวดวัคซีน${v.name}`} onError={() => setImgOk(false)} />
            ) : (
              <div className="vi-bottle-fallback"><i className="ti ti-flask-2" aria-hidden="true" /><span>ยังไม่มีรูป — วางไฟล์ที่ public{v.image}</span></div>
            )}
          </div>
          {v.packs.length > 0 && (
            <div className="vi-packs">{v.packs.map((p) => <span key={p} className="vi-pack">ขนาด {p}</span>)}</div>
          )}
        </div>

        <div className="vi-card">
          <div className="vi-card-head"><i className="ti ti-calendar-event" aria-hidden="true" /> กำหนดการฉีด</div>
          {v.schedule.length > 0 ? (
            <div className="vi-rows">
              {v.schedule.map((s) => (
                <div className="vi-row" key={s.label}><span className="vi-pill">{s.label}</span><span>{s.when}</span></div>
              ))}
            </div>
          ) : (
            <div className="vi-empty">ยังไม่มีกำหนดการในแคตตาล็อก — ยึดตามฉลาก</div>
          )}
          {/* ของจริงจากฟาร์ม — คนในเท่านั้น */}
          {isAdmin && <div className="vi-live">
            <div className="vi-live-row">
              <span className="vi-live-k">ฉีดล่าสุดในฟาร์ม</span>
              <span className="vi-live-v">{live.last ? `${fmtDate(live.last.log_date)}${live.last.barn_no ? ` · ${live.last.barn_no}` : ''}` : 'ยังไม่มีบันทึก'}</span>
            </div>
            <div className="vi-live-row">
              <span className="vi-live-k">นัดครั้งถัดไป</span>
              <span className={`vi-live-v ${live.last?.next_due_date ? 'due' : ''}`}>{live.last?.next_due_date ? fmtDate(live.last.next_due_date) : '—'}</span>
            </div>
          </div>}
        </div>

        <div className="vi-card">
          <div className="vi-card-head"><i className="ti ti-bulb" aria-hidden="true" /> สิ่งที่ควรรู้</div>
          <ul className="vi-notes">
            {v.notes.map((n, i) => (
              <li key={n}><span className="vi-note-icon"><i className={`ti ${['ti-temperature', 'ti-file-description', 'ti-circle-check'][i] || 'ti-point'}`} aria-hidden="true" /></span>{n}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 3 ปุ่ม */}
      <div className="vi-actions">
        <button type="button" className="vi-btn primary" onClick={askAI}>
          <i className="ti ti-message-chatbot" aria-hidden="true" /> ถาม AI <i className="ti ti-chevron-right vi-btn-arrow" aria-hidden="true" />
        </button>
        <button type="button" className="vi-btn" onClick={() => navigate('/vaccine-guide')}>
          <i className="ti ti-player-play" aria-hidden="true" /> ดูวิธีฉีด <i className="ti ti-chevron-right vi-btn-arrow" aria-hidden="true" />
        </button>
        <button type="button" className="vi-btn primary" onClick={() => navigate(`/vaccine?vaccine=${encodeURIComponent(v.name)}`)}>
          <i className="ti ti-clipboard-text" aria-hidden="true" /> {isAdmin ? 'บันทึกการฉีด' : 'บันทึกการฉีด (คนใน)'} <i className="ti ti-chevron-right vi-btn-arrow" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

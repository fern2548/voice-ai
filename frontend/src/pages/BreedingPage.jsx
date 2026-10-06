import { useEffect, useState } from 'react'
import BreedingLog from '../components/BreedingLog.jsx'
import SectionNav from '../components/SectionNav.jsx'
import {
  BREEDING_FACTS, BREEDING_TIMELINE, BREEDS, CROSS_PLANS, DAM_OPTIONS, GOALS,
  SELECTION, SOURCE_NOTE, recommendSire,
} from '../data/breeding.js'

// หน้า "การผสมพันธุ์" — ฟาร์มเลือกแม่พันธุ์ที่ตัวเองมี แล้วระบบบอกว่าควรใช้พ่อพันธุ์อะไร
// แต่ละฟาร์มมีแม่ไม่เหมือนกัน จึงให้เลือกเอง ไม่ฟันธงให้ตายตัว
// มีเครื่องคำนวณวันคลอดด้วย เพราะผสมแล้วต้องรู้ว่าต้องเตรียมคอกคลอดวันไหน

// หัวข้อในหน้านี้ — ใช้กับแถบด้านบน กดแล้วเลื่อนไปทันที
const SECTIONS = [
  { id: 'bd-reco', label: 'คู่ผสมที่แนะนำ', icon: 'ti-target-arrow' },
  { id: 'bd-popular', label: 'คู่ผสมยอดนิยม', icon: 'ti-git-merge' },
  { id: 'bd-breeds', label: 'สายพันธุ์', icon: 'ti-pig' },
  { id: 'bd-calendar', label: 'วันคลอด', icon: 'ti-calendar-event' },
  { id: 'bd-log', label: 'บันทึกการผสม', icon: 'ti-table' },
  { id: 'bd-facts', label: 'ข้อควรรู้', icon: 'ti-clipboard-check' },
  { id: 'bd-select', label: 'คัดตัวทำพันธุ์', icon: 'ti-checkup-list' },
]

const USE_LABEL = { sire: 'สายพ่อพันธุ์', dam: 'สายแม่พันธุ์', both: 'ใช้ได้ทั้งพ่อและแม่' }
const LS_DAM = 'farmy.breeding.dam'
const LS_GOAL = 'farmy.breeding.goal'
const read = (k, fallback) => {
  try { return localStorage.getItem(k) || fallback } catch { return fallback }
}
const todayStr = () => new Date().toLocaleDateString('sv-SE')
const addDays = (iso, n) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  d.setDate(d.getDate() + n)
  return d
}
const fmt = (d) => (d ? d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' }) : '—')
const daysFromNow = (d) => (d ? Math.round((d - new Date(new Date().toDateString())) / 86400000) : null)

export default function BreedingPage() {
  const [goal, setGoal] = useState(() => read(LS_GOAL, 'fatten'))
  const [damId, setDamId] = useState(() => read(LS_DAM, ''))
  const [mateDate, setMateDate] = useState(todayStr())
  const [openBreed, setOpenBreed] = useState(null)

  useEffect(() => { try { localStorage.setItem(LS_GOAL, goal) } catch { /* ไม่เป็นไร */ } }, [goal])
  useEffect(() => { if (damId) { try { localStorage.setItem(LS_DAM, damId) } catch { /* ไม่เป็นไร */ } } }, [damId])

  const rec = damId ? recommendSire(damId, goal) : null

  return (
    <div className="bd">
      <header className="bd-head">
        <span className="bd-head-icon"><i className="ti ti-heart-handshake" aria-hidden="true" /></span>
        <div>
          <h1 className="bd-title">แนะนำการผสมพันธุ์สุกร</h1>
          <p className="bd-sub">เลือกแม่พันธุ์ที่ฟาร์มมี แล้วระบบบอกว่าควรใช้พ่อพันธุ์อะไร</p>
        </div>
      </header>

      <SectionNav sections={SECTIONS} />

      {/* เลือกแม่ + เป้าหมาย → แนะนำพ่อ */}
      <section className="bd-match pnav-target" id="bd-reco">
        <aside className="bd-pick">
          <h2 className="bd-pick-title"><i className="ti ti-adjustments" aria-hidden="true" /> ข้อมูลสำหรับแนะนำ</h2>

          <div className="bd-pick-group">
            <span className="bd-pick-label">1. อยากได้ลูกไปทำอะไร</span>
            <div className="bd-goals">
              {GOALS.map((g) => (
                <button type="button" key={g.id} className={`bd-goal ${goal === g.id ? 'on' : ''}`}
                  onClick={() => setGoal(g.id)}>
                  <i className={`ti ${g.icon}`} aria-hidden="true" />
                  <span>
                    <b>{g.label}</b>
                    <small>{g.hint}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bd-pick-group">
            <span className="bd-pick-label">2. แม่พันธุ์ที่ฟาร์มมีตอนนี้</span>
            <div className="bd-dams">
              {DAM_OPTIONS.map((d) => (
                <button type="button" key={d.id} className={`bd-dam ${damId === d.id ? 'on' : ''}`}
                  onClick={() => setDamId(d.id)} aria-pressed={damId === d.id}>
                  <img src={d.img} alt="" className="bd-dam-img" />
                  <span className="bd-dam-text">
                    <b>{d.short}</b>
                    <small>{d.look}</small>
                  </span>
                  {damId === d.id && <i className="ti ti-circle-check bd-dam-tick" aria-hidden="true" />}
                </button>
              ))}
            </div>
            <p className="bd-pick-hint">ถ้ามีหลายพันธุ์ ให้เลือกทีละพันธุ์เพื่อดูคำแนะนำของแต่ละกลุ่ม</p>
          </div>
        </aside>

        <div className="bd-result">
          {!rec ? (
            <div className="bd-empty">
              <i className="ti ti-arrow-left" aria-hidden="true" />
              <b>เลือกแม่พันธุ์ที่ฟาร์มมีก่อน</b>
              <span>เลือกแล้วระบบจะบอกทันทีว่าควรใช้พ่อพันธุ์อะไร และลูกที่ได้จะเป็นอย่างไร</span>
            </div>
          ) : (
            <>
              <article className="bd-hero">
                <div className="bd-hero-tag"><i className="ti ti-star-filled" aria-hidden="true" /> คู่ผสมที่แนะนำ</div>
                <h2 className="bd-hero-pair">
                  {rec.sire.name} <span className="bd-hero-x">×</span> {rec.dam.short}
                </h2>
                <div className="bd-hero-goal">
                  <i className="ti ti-target-arrow" aria-hidden="true" />
                  เหมาะสำหรับ{GOALS.find((g) => g.id === goal)?.label}
                </div>
                <div className="bd-tags">
                  {rec.tags.map((t) => <span className="bd-tag" key={t}>{t}</span>)}
                </div>

                <div className="bd-trio">
                  <figure className="bd-trio-item">
                    <img src={rec.sire.img} alt={`สุกรพันธุ์${rec.sire.name}`} />
                    <figcaption><span className="bd-sex sire"><i className="ti ti-gender-male" aria-hidden="true" /> พ่อพันธุ์</span><b>{rec.sire.name}</b></figcaption>
                  </figure>
                  <span className="bd-trio-op">×</span>
                  <figure className="bd-trio-item">
                    <img src={rec.dam.img} alt={`สุกรพันธุ์${rec.dam.short}`} />
                    <figcaption><span className="bd-sex dam"><i className="ti ti-gender-female" aria-hidden="true" /> แม่พันธุ์</span><b>{rec.dam.short}</b></figcaption>
                  </figure>
                  <span className="bd-trio-op"><i className="ti ti-arrow-right" aria-hidden="true" /></span>
                  <figure className="bd-trio-item out">
                    <img src="/breeds/piglets.svg" alt="ลูกผสมที่ได้" />
                    <figcaption><span className="bd-sex out">ลูกที่ได้</span><b>{rec.out}</b><small>{rec.outNote}</small></figcaption>
                  </figure>
                </div>
              </article>

              <div className="bd-cards">
                <div className="bd-card sire">
                  <header><span>จุดเด่นพ่อพันธุ์</span><i className="ti ti-gender-male" aria-hidden="true" /></header>
                  <b>{rec.sire.name}</b>
                  <ul>{rec.sire.strong.map((x) => <li key={x}><i className="ti ti-circle-check" aria-hidden="true" />{x}</li>)}</ul>
                </div>
                <div className="bd-card dam">
                  <header><span>จุดเด่นแม่พันธุ์</span><i className="ti ti-gender-female" aria-hidden="true" /></header>
                  <b>{rec.dam.short}</b>
                  <ul>{rec.dam.strong.map((x) => <li key={x}><i className="ti ti-circle-check" aria-hidden="true" />{x}</li>)}</ul>
                </div>
                <div className="bd-card out">
                  <header><span>ผลลัพธ์ลูกผสม</span><i className="ti ti-chart-bar" aria-hidden="true" /></header>
                  <b>{rec.out}</b>
                  <ul>{rec.gain.map((x) => <li key={x}><i className="ti ti-circle-check" aria-hidden="true" />{x}</li>)}</ul>
                </div>
              </div>

              <div className="bd-notes">
                <div className="bd-note why">
                  <b><i className="ti ti-bulb" aria-hidden="true" /> ทำไมถึงแนะนำคู่นี้</b>
                  <ul>{rec.why.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
                {rec.cautions.length > 0 && (
                  <div className="bd-note warn">
                    <b><i className="ti ti-alert-triangle" aria-hidden="true" /> ข้อควรระวัง</b>
                    <ul>{rec.cautions.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                )}
                {rec.alt && (
                  <div className="bd-note alt">
                    <b><i className="ti ti-arrows-shuffle" aria-hidden="true" /> ถ้าไม่มีพ่อพันธุ์ตัวนี้</b>
                    <div className="bd-alt">
                      <img src={rec.alt.sire.img} alt={`สุกรพันธุ์${rec.alt.sire.name}`} />
                      <div>
                        <span className="bd-alt-name">ใช้พ่อพันธุ์{rec.alt.sire.name}แทนได้</span>
                        <p>{rec.alt.note}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <div className="bd-why">
        <i className="ti ti-bulb" aria-hidden="true" />
        <div>
          <b>ทำไมต้องผสมข้ามพันธุ์</b>
          <span>
            พันธุ์แท้แต่ละพันธุ์เก่งคนละด้าน — แลนด์เรซเลี้ยงลูกเก่งแต่ขาไม่แข็งแรง ดูร็อคแข็งแรงโตเร็วแต่ให้ลูกไม่ดก
            พอผสมข้ามพันธุ์ ลูกที่ได้จะรวมข้อดีของทั้งสองฝั่งและโตดีกว่าค่าเฉลี่ยของพ่อแม่
            นี่คือเหตุผลที่ฟาร์มขุนแทบไม่ใช้พันธุ์แท้ล้วน ๆ
          </span>
        </div>
      </div>

      {/* แผนผสมที่แนะนำ */}
      <section className="bd-sec pnav-target" id="bd-popular">
        <h2 className="bd-sec-title"><i className="ti ti-git-merge" aria-hidden="true" /> คู่ผสมยอดนิยมที่ฟาร์มอื่นใช้</h2>
        <div className="bd-plans">
          {CROSS_PLANS.map((p) => (
            <article className={`bd-plan ${p.recommended ? 'best' : ''}`} key={p.id}>
              <header>
                <h3>{p.title}</h3>
                {p.recommended && <span className="bd-badge">ใช้กันมากที่สุด</span>}
              </header>
              <p className="bd-plan-sum">{p.summary}</p>

              <ol className="bd-steps">
                {p.steps.map((s, i) => (
                  <li key={i}>
                    <div className="bd-cross">
                      <span className="bd-parent sire"><i className="ti ti-gender-male" aria-hidden="true" /> {s.sire}</span>
                      <span className="bd-x">×</span>
                      <span className="bd-parent dam"><i className="ti ti-gender-female" aria-hidden="true" /> {s.dam}</span>
                    </div>
                    <div className="bd-out"><i className="ti ti-arrow-down" aria-hidden="true" /> {s.out}</div>
                    <div className="bd-step-note">{s.note}</div>
                  </li>
                ))}
              </ol>

              <div className="bd-proscons">
                <div>
                  <b><i className="ti ti-thumb-up" aria-hidden="true" /> ข้อดี</b>
                  <ul>{p.pros.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
                <div>
                  <b><i className="ti ti-alert-circle" aria-hidden="true" /> ข้อควรคิด</b>
                  <ul>{p.cons.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* สายพันธุ์ */}
      <section className="bd-sec pnav-target" id="bd-breeds">
        <h2 className="bd-sec-title"><i className="ti ti-pig" aria-hidden="true" /> พันธุ์ไหนเก่งเรื่องอะไร</h2>
        <div className="bd-breeds">
          {BREEDS.map((b) => (
            <button type="button" className={`bd-breed use-${b.use} ${openBreed === b.id ? 'on' : ''}`} key={b.id}
              onClick={() => setOpenBreed(openBreed === b.id ? null : b.id)}>
              {b.img && <img src={b.img} alt={`สุกรพันธุ์${b.name}`} className="bd-breed-img" />}
              <div className="bd-breed-top">
                <b>{b.name}</b>
                <span className={`bd-use ${b.use}`}>{USE_LABEL[b.use]}</span>
              </div>
              <div className="bd-breed-meta">{b.en} · {b.origin}</div>
              <div className="bd-breed-quick">
                <span><i className="ti ti-palette" aria-hidden="true" /> {b.color}</span>
                <span><i className="ti ti-scale" aria-hidden="true" /> โตเต็มที่ {b.mature}</span>
                <span><i className="ti ti-baby-carriage" aria-hidden="true" /> {b.litter}</span>
              </div>
              {openBreed === b.id && (
                <div className="bd-breed-detail">
                  <div><b>จุดเด่น</b><ul>{b.strong.map((x) => <li key={x}>{x}</li>)}</ul></div>
                  {b.weak.length > 0 && <div><b>จุดที่ต้องระวัง</b><ul>{b.weak.map((x) => <li key={x}>{x}</li>)}</ul></div>}
                  <div className="bd-breed-note"><i className="ti ti-info-circle" aria-hidden="true" /> {b.note}</div>
                </div>
              )}
              <span className="bd-more">{openBreed === b.id ? 'ย่อ' : 'ดูจุดเด่น-จุดด้อย'}</span>
            </button>
          ))}
        </div>
      </section>

      {/* เครื่องคำนวณวันคลอด */}
      <section className="bd-sec pnav-target" id="bd-calendar">
        <h2 className="bd-sec-title"><i className="ti ti-calendar-event" aria-hidden="true" /> ผสมวันนี้ คลอดวันไหน</h2>
        <div className="panel bd-calc">
          <label className="bd-field">
            <span>วันที่ผสม</span>
            <input type="date" className="chat-input bd-date" value={mateDate} onChange={(e) => setMateDate(e.target.value)} />
          </label>

          <div className="bd-timeline">
            {BREEDING_TIMELINE.map((t) => {
              const d = addDays(mateDate, t.day)
              const left = daysFromNow(d)
              const past = left != null && left < 0
              return (
                <div className={`bd-tl ${t.day === 114 ? 'hi' : ''} ${past ? 'past' : ''}`} key={t.day}>
                  <div className="bd-tl-day">วันที่ {t.day}</div>
                  <div className="bd-tl-date">{fmt(d)}</div>
                  <div className="bd-tl-label">{t.label}</div>
                  <div className="bd-tl-desc">{t.desc}</div>
                  {left != null && <div className="bd-tl-left">{left === 0 ? 'วันนี้' : left > 0 ? `อีก ${left} วัน` : `ผ่านมาแล้ว ${-left} วัน`}</div>}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ตารางบันทึกการผสมพันธุ์ */}
      <section className="bd-sec pnav-target" id="bd-log">
        <h2 className="bd-sec-title"><i className="ti ti-table" aria-hidden="true" /> บันทึกการผสมพันธุ์</h2>
        <p className="bd-lead">
          ตารางเดียวกับแบบฟอร์มที่ใช้อยู่ ต่างกันตรงที่ช่องกำหนดกลับสัดและกำหนดคลอด ระบบคำนวณให้เอง
          และเตือนให้เมื่อใกล้ถึงกำหนด
        </p>
        <BreedingLog />
      </section>

      {/* ข้อควรรู้ในการผสมพันธุ์ */}
      <section className="bd-sec pnav-target" id="bd-facts">
        <h2 className="bd-sec-title"><i className="ti ti-clipboard-check" aria-hidden="true" /> ข้อควรรู้ในการผสมพันธุ์</h2>
        <div className="bd-facts">
          {BREEDING_FACTS.map((f) => (
            <div className="bd-fact" key={f.label}>
              <span className="bd-fact-icon"><i className={`ti ${f.icon}`} aria-hidden="true" /></span>
              <div>
                <div className="bd-fact-label">{f.label}</div>
                <b>{f.value}</b>
                <small>{f.note}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* คัดตัวทำพันธุ์ */}
      <section className="bd-sec pnav-target" id="bd-select">
        <h2 className="bd-sec-title"><i className="ti ti-checkup-list" aria-hidden="true" /> เลือกตัวไหนไว้ทำพันธุ์</h2>
        <div className="bd-select">
          <div className="bd-keep">
            <b><i className="ti ti-circle-check" aria-hidden="true" /> เก็บไว้ทำพันธุ์</b>
            <ul>{SELECTION.keep.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <div className="bd-cull">
            <b><i className="ti ti-circle-x" aria-hidden="true" /> ควรคัดออก</b>
            <ul>{SELECTION.cull.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </div>
      </section>

      <p className="bd-source">
        <i className="ti ti-book" aria-hidden="true" />
        {SOURCE_NOTE} · เป็นแนวทางทั่วไป การตัดสินใจจริงควรดูผลผลิตของฝูงตัวเองและปรึกษาสัตวบาลหรือสัตวแพทย์ประกอบ
      </p>
    </div>
  )
}

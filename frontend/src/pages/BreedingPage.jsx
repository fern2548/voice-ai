import { useState } from 'react'
import {
  BREEDING_FACTS, BREEDING_TIMELINE, BREEDS, CROSS_PLANS, SELECTION, SOURCE_NOTE,
} from '../data/breeding.js'

// หน้า "การผสมพันธุ์" — ตอบว่า "อยากได้ลูกแบบไหน ควรใช้พ่อพันธุ์อะไรผสมกับแม่พันธุ์อะไร"
// พันธุ์แท้แต่ละพันธุ์เก่งคนละด้าน ผสมข้ามแล้วลูกได้ข้อดีของทั้งสองฝั่ง
// มีเครื่องคำนวณวันคลอดด้วย เพราะผสมแล้วต้องรู้ว่าต้องเตรียมคอกคลอดวันไหน

const USE_LABEL = { sire: 'สายพ่อพันธุ์', dam: 'สายแม่พันธุ์', both: 'ใช้ได้ทั้งพ่อและแม่' }
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
  const [mateDate, setMateDate] = useState(todayStr())
  const [openBreed, setOpenBreed] = useState(null)

  return (
    <div className="bd">
      <header className="bd-head">
        <span className="bd-head-icon"><i className="ti ti-heart-handshake" aria-hidden="true" /></span>
        <div>
          <h1 className="bd-title">การผสมพันธุ์</h1>
          <p className="bd-sub">อยากได้ลูกแบบไหน ควรใช้พ่อพันธุ์อะไรผสมกับแม่พันธุ์อะไร</p>
        </div>
      </header>

      <div className="bd-why">
        <i className="ti ti-bulb" aria-hidden="true" />
        <div>
          <b>ทำไมต้องผสมข้ามพันธุ์</b>
          <span>
            พันธุ์แท้แต่ละพันธุ์เก่งคนละด้าน — แลนด์เรซเลี้ยงลูกเก่งแต่ขาไม่แข็งแรง ดูร็อคแข็งแรงโตเร็วแต่ให้ลูกไม่ดก
            พอผสมข้ามพันธุ์ ลูกที่ได้จะรวมข้อดีของทั้งสองฝั่งและโตดีกว่าค่าเฉลี่ยของพ่อแม่ (เรียกว่าพลังอัดแจ หรือ heterosis)
            นี่คือเหตุผลที่ฟาร์มขุนแทบไม่ใช้พันธุ์แท้ล้วน ๆ
          </span>
        </div>
      </div>

      {/* แผนผสมที่แนะนำ */}
      <section className="bd-sec">
        <h2 className="bd-sec-title"><i className="ti ti-git-merge" aria-hidden="true" /> แผนผสมที่แนะนำสำหรับผลิตสุกรขุน</h2>
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
      <section className="bd-sec">
        <h2 className="bd-sec-title"><i className="ti ti-pig" aria-hidden="true" /> พันธุ์ไหนเก่งเรื่องอะไร</h2>
        <div className="bd-breeds">
          {BREEDS.map((b) => (
            <button type="button" className={`bd-breed use-${b.use} ${openBreed === b.id ? 'on' : ''}`} key={b.id}
              onClick={() => setOpenBreed(openBreed === b.id ? null : b.id)}>
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
      <section className="bd-sec">
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

      {/* ตัวเลขที่ใช้จริง */}
      <section className="bd-sec">
        <h2 className="bd-sec-title"><i className="ti ti-list-numbers" aria-hidden="true" /> ตัวเลขที่ต้องรู้หน้าคอก</h2>
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
      <section className="bd-sec">
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

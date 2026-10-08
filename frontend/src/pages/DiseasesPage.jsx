import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DISEASES, findDisease } from '../data/diseases.js'

// หน้า "อาการของโรค" — /diseases = รายชื่อโรค · /diseases/<id> = อาการของโรคนั้น
// เพิ่มโรคใหม่แก้ที่ data/diseases.js ไฟล์เดียว ไม่ต้องแตะหน้านี้
// หน้านี้ช่วย "สังเกต" ไม่ใช่ "วินิจฉัย" — ยืนยันโรคต้องสัตวแพทย์เท่านั้น

/** รูปย่อของอาการ โชว์บนการ์ดรายชื่อโรค ให้กวาดตาเทียบกับที่เห็นในคอกได้เลย */
function SignThumb({ id, alt }) {
  const [src, setSrc] = useState(`/diseases/${id}.webp`)
  return (
    <img className="dz-thumb" src={src} alt={alt} loading="lazy"
      onError={() => setSrc((p) => (p.endsWith('.webp') ? `/diseases/${id}.svg` : p))} />
  )
}

function SignImage({ id, alt }) {
  // ลองรูปถ่ายจริงของฟาร์มก่อน ไม่มีค่อยใช้ภาพวาด
  const [src, setSrc] = useState(`/diseases/${id}.webp`)
  return (
    <img className="fm-img" src={src} alt={alt} loading="lazy"
      onError={() => setSrc((s) => (s.endsWith('.webp') ? `/diseases/${id}.svg` : s))} />
  )
}

export default function DiseasesPage() {
  const { id } = useParams()
  const disease = id ? findDisease(id) : null
  if (id && disease?.ready) return <DiseaseDetail d={disease} />
  return <DiseaseList notFound={id ? disease?.name || id : null} />
}

// ---------- รายชื่อโรค ----------
function DiseaseList({ notFound }) {
  // โชว์เฉพาะโรคที่มีภาพอาการแล้ว โรคที่ยังไม่มีไม่ต้องขึ้นให้รก
  const ready = DISEASES.filter((d) => d.ready)

  return (
    <div className="fm">
      <header className="fm-head">
        <span className="fm-head-icon"><i className="ti ti-virus" aria-hidden="true" /></span>
        <div>
          <h1 className="fm-title">อาการของโรค</h1>
          <p className="fm-sub">ดูภาพอาการของโรคสำคัญในสุกร เทียบกับที่เห็นจริงในคอก</p>
        </div>
      </header>

      {notFound && (
        <div className="fm-warn">
          <i className="ti ti-info-circle" aria-hidden="true" />
          <div><b>ยังไม่มีภาพอาการของ {notFound}</b>
            <span>เลือกจากโรคด้านล่างที่มีภาพอาการแล้ว</span></div>
        </div>
      )}

      <div className="dz-grid">
        {ready.map((d) => (
          <Link to={`/diseases/${d.id}`} className={`dz-card ${d.tone}`} key={d.id}>
            <div className="dz-top">
              <span className="dz-icon"><i className={`ti ${d.icon}`} aria-hidden="true" /></span>
              <div className="dz-title">
                <h2>{d.name}</h2>
                <small>{d.en}</small>
              </div>
            </div>
            <p className="dz-sum">{d.summary}</p>

            {/* รูปอาการขึ้นมาให้เห็นเลย ไม่ต้องกดเข้าไปก่อนถึงจะรู้ว่าหน้าตาเป็นยังไง */}
            <div className="dz-thumbs">
              {d.signs.map((sg) => (
                <figure className="dz-thumb-box" key={sg.id}>
                  <SignThumb id={sg.id} alt={`อาการที่${sg.title}`} />
                  <figcaption>{sg.title}</figcaption>
                </figure>
              ))}
            </div>

            <span className="dz-go">ดูอาการทั้งหมด {d.signs.length} ตำแหน่ง <i className="ti ti-arrow-right" aria-hidden="true" /></span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ---------- อาการของโรคหนึ่ง ----------
function DiseaseDetail({ d }) {
  const navigate = useNavigate()
  const askVet = (sign) =>
    navigate(`/vet?ask=${encodeURIComponent(`สงสัย${d.name} — พบอาการที่${sign.title}`)}`)

  return (
    <div className="fm">
      <header className="fm-head">
        <Link to="/diseases" className="fm-back" aria-label="กลับไปรายชื่อโรค"><i className="ti ti-arrow-left" aria-hidden="true" /></Link>
        <span className="fm-head-icon"><i className={`ti ${d.icon}`} aria-hidden="true" /></span>
        <div>
          <h1 className="fm-title">อาการโรค{d.name}</h1>
          <p className="fm-sub">{d.en} · ใช้เทียบกับที่เห็นจริงในคอก</p>
        </div>
        {d.vaccineId && (
          <Link to={`/vaccine-info?v=${d.vaccineId}`} className="btn-clear fm-go">
            <i className="ti ti-vaccine" aria-hidden="true" /> วัคซีนป้องกัน
          </Link>
        )}
      </header>

      {d.warn && (
        <div className="fm-warn">
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <div><b>สงสัยเมื่อไหร่ ให้แจ้งทันที</b><span>{d.warn}</span></div>
        </div>
      )}

      <div className="fm-grid">
        {d.signs.map((s, i) => (
          <section className="fm-card" key={s.id}>
            <div className="fm-card-img">
              <SignImage id={s.id} alt={`ภาพอาการ${s.title}`} />
              <span className="fm-badge">{['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ'][i] || i + 1}</span>
            </div>
            <div className="fm-card-body">
              <h2 className="fm-card-title">{s.title}</h2>
              <div className="fm-stage"><i className="ti ti-clock" aria-hidden="true" /> {s.stage}</div>
              <div className="fm-where"><i className="ti ti-map-pin" aria-hidden="true" /> ดูที่: {s.where}</div>
              <ul className="fm-signs">
                {s.list.map((x) => <li key={x}><i className="ti ti-point-filled" aria-hidden="true" />{x}</li>)}
              </ul>
              <button type="button" className="btn-clear fm-ask" onClick={() => askVet(s)}>
                <i className="ti ti-stethoscope" aria-hidden="true" /> เจออาการแบบนี้ ปรึกษาสัตวแพทย์
              </button>
            </div>
          </section>
        ))}
      </div>

      {d.actions?.length > 0 && (
        <section className="panel fm-sec">
          <div className="fm-sec-head"><i className="ti ti-urgent" aria-hidden="true" /> สงสัยแล้วต้องทำอะไรบ้าง</div>
          <ol className="fm-actions">
            {d.actions.map((a, i) => (
              <li key={a.title}>
                <span className="fm-step">{i + 1}</span>
                <i className={`ti ${a.icon}`} aria-hidden="true" />
                <div><b>{a.title}</b><small>{a.desc}</small></div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {d.lookalike?.length > 0 && (
        <section className="panel fm-sec">
          <div className="fm-sec-head"><i className="ti ti-help-circle" aria-hidden="true" /> อาการคล้ายกันแต่เป็นคนละโรค</div>
          <div className="fm-look">{d.lookalike.map((x) => <span className="fm-look-item" key={x}>{x}</span>)}</div>
          <p className="fm-note">ดูด้วยตาอย่างเดียวแยกไม่ได้ — ถ้าเห็นอาการเข้าข่าย ให้ถือว่าสงสัยไว้ก่อนแล้วแจ้งเจ้าหน้าที่</p>
        </section>
      )}

      <p className="fm-credit">
        <i className="ti ti-pencil" aria-hidden="true" />
        ภาพประกอบเป็นภาพวาดที่จัดทำขึ้นเองสำหรับฟาร์มนี้ ไม่ได้นำภาพจากแหล่งอื่นมาใช้ ·
        ถ่ายรูปอาการจริงแล้ววางไฟล์ที่ <code>public/diseases/</code> ระบบจะใช้รูปถ่ายแทนภาพวาดให้เอง
      </p>
    </div>
  )
}

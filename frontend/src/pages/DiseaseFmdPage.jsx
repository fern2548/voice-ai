import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FMD_ACTIONS, FMD_LOOKALIKE, FMD_SIGNS } from '../data/fmdSigns.js'

// หน้า "อาการโรคปากและเท้าเปื่อย" — ให้คนหน้างานเทียบกับที่เห็นจริงในคอกได้เลย
// ภาพเป็นภาพวาดของเราเอง ถ้ามีรูปถ่ายของฟาร์ม (public/diseases/<id>.webp) จะใช้รูปถ่ายแทนอัตโนมัติ
// หน้านี้ช่วย "สังเกต" ไม่ใช่ "วินิจฉัย" — ยืนยันโรคต้องสัตวแพทย์เท่านั้น

function SignImage({ id, alt }) {
  // ลองรูปถ่ายจริงก่อน ไม่มีค่อยใช้ภาพวาด
  const [src, setSrc] = useState(`/diseases/${id}.webp`)
  return (
    <img
      className="fm-img"
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setSrc((s) => (s.endsWith('.webp') ? `/diseases/${id}.svg` : s))}
    />
  )
}

export default function DiseaseFmdPage() {
  const navigate = useNavigate()

  // ถ่ายรูปแล้วส่งปรึกษาหมอในชุมชน — พาไปหน้าโพสต์พร้อมหัวข้อตั้งต้น
  const askVet = (sign) =>
    navigate(`/vet?ask=${encodeURIComponent(`สงสัยปากและเท้าเปื่อย — พบอาการที่${sign.title}`)}`)

  return (
    <div className="fm">
      <header className="fm-head">
        <span className="fm-head-icon"><i className="ti ti-virus" aria-hidden="true" /></span>
        <div>
          <h1 className="fm-title">อาการโรคปากและเท้าเปื่อย</h1>
          <p className="fm-sub">Foot and Mouth Disease (FMD) ในสุกร · ใช้เทียบกับที่เห็นจริงในคอก</p>
        </div>
        <Link to="/vaccine-info?v=fmd" className="btn-clear fm-go">
          <i className="ti ti-vaccine" aria-hidden="true" /> วัคซีนป้องกัน
        </Link>
      </header>

      <div className="fm-warn">
        <i className="ti ti-alert-triangle" aria-hidden="true" />
        <div>
          <b>สงสัยเมื่อไหร่ ให้แจ้งทันที</b>
          <span>โรคนี้ติดต่อเร็วมากและเป็นโรคระบาดสัตว์ตามกฎหมาย หน้านี้ช่วยให้สังเกตอาการเบื้องต้นเท่านั้น
            การยืนยันโรคต้องให้สัตวแพทย์ตรวจและเก็บตัวอย่างส่งตรวจ</span>
        </div>
      </div>

      <div className="fm-grid">
        {FMD_SIGNS.map((s, i) => (
          <section className="fm-card" key={s.id}>
            <div className="fm-card-img">
              <SignImage id={s.id} alt={`ภาพวาดอาการ${s.title}`} />
              <span className="fm-badge">{['ก', 'ข', 'ค', 'ง'][i]}</span>
            </div>
            <div className="fm-card-body">
              <h2 className="fm-card-title">{s.title}</h2>
              <div className="fm-stage"><i className="ti ti-clock" aria-hidden="true" /> {s.stage}</div>
              <div className="fm-where"><i className="ti ti-map-pin" aria-hidden="true" /> ดูที่: {s.where}</div>
              <ul className="fm-signs">
                {s.signs.map((x) => <li key={x}><i className="ti ti-point-filled" aria-hidden="true" />{x}</li>)}
              </ul>
              <button type="button" className="btn-clear fm-ask" onClick={() => askVet(s)}>
                <i className="ti ti-stethoscope" aria-hidden="true" /> เจออาการแบบนี้ ปรึกษาสัตวแพทย์
              </button>
            </div>
          </section>
        ))}
      </div>

      <section className="panel fm-sec">
        <div className="fm-sec-head"><i className="ti ti-urgent" aria-hidden="true" /> สงสัยแล้วต้องทำอะไรบ้าง</div>
        <ol className="fm-actions">
          {FMD_ACTIONS.map((a, i) => (
            <li key={a.title}>
              <span className="fm-step">{i + 1}</span>
              <i className={`ti ${a.icon}`} aria-hidden="true" />
              <div><b>{a.title}</b><small>{a.desc}</small></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel fm-sec">
        <div className="fm-sec-head"><i className="ti ti-help-circle" aria-hidden="true" /> อาการคล้ายกันแต่เป็นคนละโรค</div>
        <div className="fm-look">
          {FMD_LOOKALIKE.map((x) => <span className="fm-look-item" key={x}>{x}</span>)}
        </div>
        <p className="fm-note">
          ดูด้วยตาอย่างเดียวแยกไม่ได้ — ถ้าเห็นตุ่มน้ำหรือแผลที่ปากหรือกีบ ให้ถือว่าสงสัยโรคปากและเท้าเปื่อยไว้ก่อน แล้วแจ้งเจ้าหน้าที่
        </p>
      </section>

      <p className="fm-credit">
        <i className="ti ti-pencil" aria-hidden="true" />
        ภาพประกอบทั้งหมดเป็นภาพวาดที่จัดทำขึ้นเองสำหรับฟาร์มนี้ ไม่ได้นำภาพจากแหล่งอื่นมาใช้ ·
        ถ่ายรูปอาการจริงของฟาร์มแล้ววางไฟล์ที่ <code>public/diseases/</code> ระบบจะใช้รูปถ่ายแทนภาพวาดให้เอง
      </p>
    </div>
  )
}

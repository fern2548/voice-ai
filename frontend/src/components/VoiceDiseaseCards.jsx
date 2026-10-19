import { useEffect, useState } from 'react'
import { findDisease } from '../data/diseases.js'
import { OBSERVE_MORE, NO_IMAGE_NOTE } from '../data/symptomIndex.js'

/**
 * การ์ดโรคที่เข้าเค้ากับอาการที่ผู้ใช้พูด — แสดงในหน้า Voice AI เท่านั้น
 *
 * ตั้งใจให้จบในหน้าเดียว ไม่มีลิงก์พาไปหน้าอื่น
 * อยากดูภาพใหญ่ก็แตะที่รูป จะกางเต็มจอทับหน้าเดิม แล้วปิดกลับมาที่เดิมได้
 *
 * ย้ำเสมอว่านี่คือการตั้งข้อสังเกต ไม่ใช่ผลวินิจฉัย
 */

/** รูปอาการ ลองรูปถ่าย/การ์ดจริงก่อน ถ้าไม่มีค่อยถอยไปใช้ภาพวาด (ชุดเดียวกับหน้าอาการของโรค) */
function SignImg({ id, alt, className, onClick }) {
  const [src, setSrc] = useState(`/diseases/${id}.webp`)
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onClick={onClick}
      onError={() => setSrc((p) => (p.endsWith('.webp') ? `/diseases/${id}.svg` : p))}
    />
  )
}

/** ภาพใหญ่เต็มจอ — การ์ดอาการมีตัวหนังสือในรูป ย่อแล้วอ่านไม่ออก ต้องกางดูได้ */
function Lightbox({ sign, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="vdx-lb" onClick={onClose} role="dialog" aria-label={sign.title}>
      <button className="vdx-lb-close" onClick={onClose} aria-label="ปิดภาพ">
        <i className="ti ti-x" aria-hidden="true" />
      </button>
      <figure className="vdx-lb-inner" onClick={(e) => e.stopPropagation()}>
        <SignImg id={sign.id} alt={sign.title} className="vdx-lb-img" />
        <figcaption className="vdx-lb-cap">
          <b>{sign.title}</b>
          {sign.where && <span>ดูที่: {sign.where}</span>}
        </figcaption>
      </figure>
    </div>
  )
}

export default function VoiceDiseaseCards({ result }) {
  const [zoom, setZoom] = useState(null)
  // บางครั้งจับได้แต่โรคที่ยังไม่มีภาพ (เช่นพูดถึงท้องเสียอย่างเดียว) ก็ยังต้องขึ้นบรรทัดเตือนให้
  if (!result?.cards?.length && !result?.others?.length) return null

  return (
    <div className="vdx">
      <div className="vdx-warn">
        <i className="ti ti-alert-triangle" aria-hidden="true" />
        <span>
          {result.named
            ? 'ภาพอาการและจุดที่ต้องสังเกตของโรคนี้อยู่ด้านล่าง '
            : result.broad
              ? 'อาการนี้พบได้ในหลายโรค ลองเทียบภาพอาการจุดอื่นด้านล่างกับที่เห็นจริงในคอก '
              : 'อาการที่บอกมาเข้าได้กับโรคด้านล่าง '}
          <b>เป็นการตั้งข้อสังเกตเท่านั้น</b>{' '}
          การยืนยันโรคต้องให้สัตวแพทย์ตรวจและเก็บตัวอย่างส่งตรวจ
        </span>
      </div>

      {result.cards?.map((m) => {
        const d = findDisease(m.id)
        if (!d) return null
        // เอาภาพของอาการที่ตรงกับที่ผู้ใช้พูดขึ้นก่อน แล้วต่อด้วยอาการจุดอื่นของโรคเดียวกันจนครบ
        // อาการเดียวแยกโรคไม่ได้ ต้องเห็นภาพจุดอื่นด้วยถึงจะไปเทียบกับที่เห็นในคอกได้จริง
        const picked = m.signs.map((sid) => d.signs?.find((s) => s.id === sid)).filter(Boolean)
        const rest = (d.signs || []).filter((s) => !picked.includes(s))
        const shown = [...picked, ...rest]

        return (
          <article className={`vdx-card ${d.tone}`} key={m.id}>
            <header className="vdx-head">
              <span className="vdx-icon">
                {d.iconImg
                  ? <img src={d.iconImg} alt="" loading="lazy" />
                  : <i className={`ti ${d.icon}`} aria-hidden="true" />}
              </span>
              <div className="vdx-name">
                <h3>{d.name}</h3>
                <small>{d.en}</small>
              </div>
              <span className={`vdx-urgent ${d.tone}`}>
                {d.tone === 'red' ? 'ด่วน แจ้งสัตวแพทย์' : 'เฝ้าระวังใกล้ชิด'}
              </span>
            </header>

            {m.labels.length > 0 && (
              <div className="vdx-hits">
                <span className="vdx-hits-label">อาการที่ตรงกัน</span>
                {m.labels.map((l) => (
                  <span className="vdx-hit" key={l}>{l}</span>
                ))}
              </div>
            )}

            {shown.length > 0 && (
              <>
                <div className="vdx-imgs">
                  {shown.map((s) => (
                    <button className="vdx-img-btn" key={s.id} onClick={() => setZoom(s)}>
                      <SignImg id={s.id} alt={s.title} className="vdx-img" />
                      <span className="vdx-img-cap">{s.title}</span>
                      <span className="vdx-img-zoom" aria-hidden="true">
                        <i className="ti ti-zoom-in" />
                      </span>
                    </button>
                  ))}
                </div>
                <p className="vdx-imghint">แตะที่รูปเพื่อดูภาพใหญ่</p>
              </>
            )}

            <div className="vdx-observe">
              <h4><i className="ti ti-eye-search" aria-hidden="true" /> ให้สังเกตเพิ่ม</h4>
              <ul>
                {OBSERVE_MORE[m.id].map((o) => <li key={o}>{o}</li>)}
              </ul>
            </div>
          </article>
        )
      })}

      {result.others?.length > 0 && (
        <div className="vdx-others">
          <i className="ti ti-info-circle" aria-hidden="true" />
          <div>
            <b>{result.named
              ? 'โรคนี้ยังไม่มีภาพอาการในระบบ'
              : 'โรคอื่นที่อาการใกล้เคียง (ยังไม่มีภาพในระบบ)'}</b>
            <ul>
              {result.others.map((o) => {
                const d = findDisease(o.id)
                // โรคที่มีรูปแล้วแต่ตกขอบการ์ด ใช้คำสรุปของโรคนั้นแทนข้อความ "ยังไม่มีภาพ"
                return (
                  <li key={o.id}>
                    <b>{d?.name || o.id}</b> — {NO_IMAGE_NOTE[o.id] || d?.summary || ''}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      {zoom && <Lightbox sign={zoom} onClose={() => setZoom(null)} />}
    </div>
  )
}

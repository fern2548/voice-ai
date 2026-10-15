import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * ชุดรูปประกอบคำตอบ สำหรับหัวข้อที่ฟาร์มทำรูปไว้แล้ว (วิธีฉีดวัคซีน · สายพันธุ์)
 *
 * แยกจากการ์ดอาการโรค เพราะอันนี้เป็นรูปสอนวิธีทำ ไม่ใช่รูปให้เทียบอาการ
 * จึงไม่ต้องมีชิป "อาการที่ตรงกัน" หรือรายการ "ให้สังเกตเพิ่ม"
 */

function Shot({ src, alt, onClick }) {
  const [ok, setOk] = useState(true)
  if (!ok) return null
  return (
    <img className="vz-img" src={src} alt={alt} loading="lazy"
      onClick={onClick} onError={() => setOk(false)} />
  )
}

function Lightbox({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="vdx-lb" onClick={onClose} role="dialog" aria-label={item.title}>
      <button className="vdx-lb-close" onClick={onClose} aria-label="ปิดภาพ">
        <i className="ti ti-x" aria-hidden="true" />
      </button>
      <figure className="vdx-lb-inner" onClick={(e) => e.stopPropagation()}>
        <img className="vdx-lb-img" src={item.img} alt={item.title} />
        <figcaption className="vdx-lb-cap">
          <b>{item.title}</b>
          {item.tag && <span>{item.tag}</span>}
        </figcaption>
      </figure>
    </div>
  )
}

export default function VoiceVisuals({ result }) {
  const [zoom, setZoom] = useState(null)
  if (!result?.items?.length) return null

  return (
    <div className="vz">
      <div className="vz-head">
        <h3>{result.title}</h3>
        {result.to && (
          <Link to={result.to} className="vz-more">
            {result.toLabel} <i className="ti ti-chevron-right" aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="vz-grid">
        {result.items.map((it) => (
          <figure className="vz-card" key={it.title + it.img}>
            <button className="vz-shot" onClick={() => setZoom(it)} aria-label={`ดูภาพใหญ่ ${it.title}`}>
              <Shot src={it.img} alt={it.title} />
              <span className="vdx-img-zoom" aria-hidden="true"><i className="ti ti-zoom-in" /></span>
            </button>
            <figcaption className="vz-cap">
              <b>{it.title}</b>
              {it.tag && <span className="vz-tag">{it.tag}</span>}
              {it.lines?.map((l) => <span className="vz-line" key={l}>{l}</span>)}
            </figcaption>
          </figure>
        ))}
      </div>

      {result.note && <p className="vz-note">{result.note}</p>}
      {zoom && <Lightbox item={zoom} onClose={() => setZoom(null)} />}
    </div>
  )
}

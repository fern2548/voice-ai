import { useEffect, useState } from 'react'
import { useVoiceAI } from '../context/VoiceAI.jsx'
import { speak, stopSpeaking } from '../utils/voice.js'

// หน้า "คู่มือการฉีดวัคซีนสุกร" — คู่มือภาพตำแหน่งฉีดที่ถูกต้อง ให้คนงานเปิดดูหน้าเล้าได้ทันที
// โครง: หัวเรื่อง → เลือกประเภทสัตว์ (3 การ์ด) → ภาพใหญ่ซ้าย + 4 กล่องอธิบายขวา + ปุ่มฟัง/ขยาย/ถาม AI
//       → แถบ "สิ่งที่ต้องจำทุกครั้ง" ล่างสุด
// ภาพเป็นไฟล์นิ่งใน public/guide — ไม่ต้องดึงจากเซิร์ฟเวอร์ เปิดได้แม้เน็ตช้า

const GUIDES = [
  {
    id: 'piglet-sc',
    who: 'ลูกสุกร',
    route: 'SC',
    routeLabel: 'ฉีดเข้าใต้ผิวหนัง',
    short: 'ใช้ฉีดใต้ผิวหนังบริเวณขาหนีบ / ข้างลำตัวส่วนท้าย',
    img: '/guide/vaccine-sc-piglet.webp',
    spot: 'ใต้ผิวหนังบริเวณขาหนีบ / ข้างลำตัวส่วนท้าย',
    how: 'ใช้นิ้วจับยกผิวหนังขึ้นให้เป็นสัน แล้วแทงเข็มเข้าใต้ผิวที่ยกไว้ ทำมุมเอียงกับตัวหมู',
    why: 'ลูกสุกรผิวบาง กล้ามเนื้อน้อย ฉีดยาชั้นใต้ผิวได้ง่ายและไม่โดนกล้ามเนื้อ',
    care: 'ให้คนหนึ่งจับลูกหมูให้นิ่งก่อน และยกผิวแล้วค่อยแทง อย่าแทงลึกจนทะลุกล้ามเนื้อ',
  },
  {
    id: 'pig-im',
    who: 'สุกรทั่วไป',
    route: 'IM',
    routeLabel: 'ฉีดเข้ากล้ามเนื้อ',
    short: 'ฉีดเข้ากล้ามเนื้อคอด้านข้าง หลังใบหู',
    img: '/guide/vaccine-im-pig.webp',
    spot: 'กล้ามเนื้อคอด้านข้าง หลังใบหู',
    how: 'แทงเข็มตั้งฉากกับผิวหนัง ให้เข็มเข้าถึงชั้นกล้ามเนื้อ ไม่ต้องยกผิว',
    why: 'กล้ามเนื้อคอหนาพอ ไม่ใกล้เส้นเลือดใหญ่ และไม่ทำให้เนื้อส่วนขาย (สะโพก/สันนอก) ช้ำ',
    care: 'ห้ามฉีดที่สะโพกหรือขาหลัง — ทำเนื้อช้ำและเสี่ยงโดนเส้นประสาท เปลี่ยนเข็มเมื่อทื่อหรือเปลี่ยนคอก',
  },
  {
    id: 'adult-sc',
    who: 'สุกรโตเต็มวัย',
    route: 'SC',
    routeLabel: 'ฉีดเข้าใต้ผิวหนัง',
    short: 'ใช้ฉีดใต้ผิวหนังด้านคอ หลังใบหู',
    img: '/guide/vaccine-sc-adult.webp',
    spot: 'ใต้ผิวหนังด้านคอ หลังใบหู',
    how: 'จับยกผิวหนังหลังใบหูขึ้น แล้วแทงเข็มเข้าใต้ผิวที่ยกไว้ ทำมุมเอียง',
    why: 'จุดเดียวกับการฉีดเข้ากล้ามแต่ตื้นกว่า — ใช้กับวัคซีนที่ฉลากระบุให้ฉีดใต้ผิวหนัง',
    care: 'ผิวหนังสุกรโตหนา ต้องยกให้ได้สันชัด ๆ ก่อนแทง ถ้าใช้ตัวจับหมู (snare) ให้ฉีดฝั่งตรงข้ามกับคนจับ',
  },
]

const INFO_ROWS = [
  { key: 'spot', icon: 'ti-map-pin', tone: 'green', title: 'ตำแหน่ง' },
  { key: 'how', icon: 'ti-vaccine', tone: 'green', title: 'วิธีแทงเข็ม' },
  { key: 'why', icon: 'ti-bulb', tone: 'amber', title: 'เหตุผลที่เลือกจุดนี้' },
  { key: 'care', icon: 'ti-alert-triangle', tone: 'red', title: 'ข้อควรระวัง' },
]

// กติกาที่ใช้ร่วมกันทุกวิธี — ตัวเลขเฉพาะ (ขนาดเข็ม, โดส) ให้ยึดฉลากวัคซีน ไม่ใส่ในนี้ กันใช้ผิด
const COMMON = [
  { icon: 'ti-snowflake', title: 'เก็บวัคซีนที่ 2–8°C', text: 'ห้ามแช่แข็ง ห้ามโดนแดด และเขย่าเบา ๆ ก่อนดูด' },
  { icon: 'ti-file-description', title: 'ใช้ขนาดเข็มและขนาดยาให้ถูกต้อง', text: 'โดย ขนาดเข็ม และ SC/IM ให้ยึดตามฉลากวัคซีนหรือคำแนะนำสัตวแพทย์' },
  { icon: 'ti-droplet', title: 'ตำแหน่งฉีดต้องสะอาด', text: 'หมูต้องแห้งและสะอาด — หลีกเลี่ยงโคลนและสิ่งสกปรก' },
  { icon: 'ti-clock', title: 'ฉีดแล้วบันทึกและติดตามอาการ', text: 'ตรวจอาการหลังฉีดวันที่ 1, 3, 7 ตามที่ระบบเตือน' },
]

export default function VaccineGuidePage() {
  const [active, setActive] = useState(GUIDES[0].id)
  const [zoom, setZoom] = useState(false)
  const { ask } = useVoiceAI()
  const g = GUIDES.find((x) => x.id === active) || GUIDES[0]

  // ปิดภาพเต็มจอด้วย Esc และหยุดพูดเมื่อออกจากหน้า
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setZoom(false) }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); stopSpeaking() }
  }, [])

  // อ่านคำอธิบายของแบบที่เลือก — คนงานมือไม่ว่าง ฟังเอาได้
  const listen = () => {
    speak(`${g.who} ${g.routeLabel} ตำแหน่ง ${g.spot} วิธีแทงเข็ม ${g.how} ข้อควรระวัง ${g.care}`)
  }

  // เปิดกล่องแชทลอย แล้วส่งคำถามให้ AI เลย
  const askAI = () => {
    window.dispatchEvent(new Event('farmy:chat-open'))
    ask(`${g.who}ฉีดวัคซีน${g.routeLabel}ตรงไหน มีอะไรต้องระวัง`)
  }

  return (
    <div className="vg">
      {/* หัวเรื่อง */}
      <header className="vg-head">
        <div className="vg-head-icon"><i className="ti ti-vaccine" aria-hidden="true" /></div>
        <div>
          <h1 className="vg-title">คู่มือการฉีดวัคซีนสุกร</h1>
          <p className="vg-sub">เลือกประเภทสัตว์เพื่อดูตำแหน่งฉีดและวิธีแทงเข็มที่ถูกต้อง</p>
        </div>
        <i className="ti ti-pig vg-head-deco" aria-hidden="true" />
      </header>

      {/* เลือกประเภทสัตว์ */}
      <div className="vg-pick" role="tablist">
        {GUIDES.map((x) => {
          const on = x.id === active
          return (
            <button key={x.id} role="tab" aria-selected={on} className={`vg-pick-card ${on ? 'on' : ''}`} onClick={() => setActive(x.id)}>
              <span className={`vg-pick-icon ${x.route.toLowerCase()}`}><i className="ti ti-pig" aria-hidden="true" /></span>
              <span className="vg-pick-text">
                <span className="vg-pick-name">{x.who} <span className={`vg-route ${x.route.toLowerCase()}`}>{x.route}</span></span>
                <span className="vg-pick-desc">{x.short}</span>
              </span>
              <span className={`vg-radio ${on ? 'on' : ''}`} aria-hidden="true">{on && <i className="ti ti-check" />}</span>
            </button>
          )
        })}
      </div>

      {/* ภาพ + คำอธิบาย */}
      <div className="vg-main">
        <button type="button" className="vg-figure" onClick={() => setZoom(true)} aria-label="ดูภาพขยาย">
          <img src={g.img} alt={`ตำแหน่งฉีด ${g.routeLabel} สำหรับ${g.who}`} className="vg-img" />
        </button>

        <div className="vg-side">
          {INFO_ROWS.map((r) => (
            <div className="vg-info" key={r.key}>
              <span className={`vg-info-icon ${r.tone}`}><i className={`ti ${r.icon}`} aria-hidden="true" /></span>
              <div>
                <div className="vg-info-title">{r.title}</div>
                <div className="vg-info-text">{g[r.key]}</div>
              </div>
            </div>
          ))}
          <div className="vg-actions">
            <button type="button" className="vg-btn primary" onClick={listen}>
              <i className="ti ti-volume" aria-hidden="true" /> ฟังคำอธิบาย
            </button>
            <button type="button" className="vg-btn" onClick={() => setZoom(true)}>
              <i className="ti ti-zoom-in" aria-hidden="true" /> ดูภาพขยาย
            </button>
            <button type="button" className="vg-btn" onClick={askAI}>
              <i className="ti ti-message-chatbot" aria-hidden="true" /> ถาม AI เพิ่มเติม
            </button>
          </div>
        </div>
      </div>

      {/* กติกาทุกครั้ง */}
      <section className="vg-common">
        <div className="vg-common-head"><i className="ti ti-flame" aria-hidden="true" /> สิ่งที่ต้องจำทุกครั้งก่อนฉีด</div>
        <div className="vg-common-grid">
          {COMMON.map((c) => (
            <div className="vg-tile" key={c.title}>
              <span className="vg-tile-icon"><i className={`ti ${c.icon}`} aria-hidden="true" /></span>
              <div>
                <div className="vg-tile-title">{c.title}</div>
                <div className="vg-tile-text">{c.text}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="vg-hint">
          <i className="ti ti-sparkles" aria-hidden="true" />
          ลองถาม AI ได้ เช่น “ลูกสุกรฉีดตรงไหน?” “ฉีดเข้ากล้ามฉีดตรงไหน?” หรือ “เปิดวิธีฉีดวัคซีน”
        </div>
      </section>

      {zoom && (
        <div className="vg-lightbox" onClick={() => setZoom(false)} role="dialog" aria-label="ภาพขยาย">
          <img src={g.img} alt={`ตำแหน่งฉีด ${g.routeLabel} สำหรับ${g.who}`} />
          <button type="button" className="vg-lightbox-close" onClick={() => setZoom(false)} aria-label="ปิด">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}

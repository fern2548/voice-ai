import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

// หน้า "วิธีฉีดวัคซีน" — คู่มือภาพตำแหน่งฉีดที่ถูกต้อง ให้คนงานเปิดดูหน้าเล้าได้ทันที
// เลือกตามตัวหมู (ลูกสุกร / สุกรขุน / สุกรโตเต็มวัย) แล้วโชว์ภาพใหญ่ + สรุปสั้น ๆ
// ภาพเป็นไฟล์นิ่งใน public/guide — ไม่ต้องดึงจากเซิร์ฟเวอร์ เปิดได้แม้เน็ตช้า

const GUIDES = [
  {
    id: 'piglet-sc',
    who: 'ลูกสุกร',
    route: 'SC',
    routeLabel: 'ฉีดเข้าใต้ผิวหนัง',
    img: '/guide/vaccine-sc-piglet.webp',
    spot: 'ใต้ผิวหนังบริเวณขาหนีบ / ข้างลำตัวส่วนท้าย',
    how: 'ใช้นิ้วจับยกผิวหนังขึ้นให้เป็นสัน แล้วแทงเข็มเข้าใต้ผิวที่ยกไว้ ทำมุมเอียงกับตัวหมู',
    why: 'ลูกสุกรผิวบาง กล้ามเนื้อน้อย จุดนี้จับยกผิวได้ง่ายและไม่โดนกล้ามเนื้อ',
    tips: ['ให้คนหนึ่งอุ้มลูกหมูให้นิ่งก่อน', 'ยกผิวแล้วค่อยแทง อย่าแทงลึกจนทะลุอีกด้าน', 'ดันยาช้า ๆ แล้วกดตรงรอยฉีดเบา ๆ ตอนถอนเข็ม'],
  },
  {
    id: 'pig-im',
    who: 'สุกรทั่วไป',
    route: 'IM',
    routeLabel: 'ฉีดเข้ากล้ามเนื้อ',
    img: '/guide/vaccine-im-pig.webp',
    spot: 'กล้ามเนื้อคอด้านข้าง หลังใบหู',
    how: 'แทงเข็มตั้งฉากกับผิวหนัง ให้เข็มเข้าถึงกล้ามเนื้อ ไม่ต้องยกผิว',
    why: 'กล้ามเนื้อคอหนาพอ ไม่ใกล้เส้นเลือดใหญ่ และไม่ทำให้เนื้อส่วนขาย (สะโพก/สันนอก) ช้ำ',
    tips: ['ห้ามฉีดที่สะโพกหรือขาหลัง — ทำเนื้อช้ำและเสี่ยงโดนเส้นประสาท', 'เลือกเข็มยาวให้ถึงกล้ามเนื้อตามขนาดตัว', 'เปลี่ยนเข็มทุกคอกหรือเมื่อเข็มทื่อ'],
  },
  {
    id: 'adult-sc',
    who: 'สุกรโตเต็มวัย',
    route: 'SC',
    routeLabel: 'ฉีดเข้าใต้ผิวหนัง',
    img: '/guide/vaccine-sc-adult.webp',
    spot: 'ใต้ผิวหนังด้านคอ หลังใบหู',
    how: 'จับยกผิวหนังหลังใบหูขึ้น แล้วแทงเข็มเข้าใต้ผิวที่ยกไว้ ทำมุมเอียง',
    why: 'จุดเดียวกับ IM แต่ตื้นกว่า — ใช้กับวัคซีนที่ฉลากระบุให้ฉีดใต้ผิวหนัง',
    tips: ['ดูฉลากวัคซีนก่อนว่าต้อง SC หรือ IM', 'ผิวหนังสุกรโตหนา ต้องยกให้ได้สันชัด ๆ ก่อนแทง', 'ถ้าใช้ตัวจับหมู (snare) ให้ฉีดฝั่งตรงข้ามกับคนจับ'],
  },
]

// กติกาที่ใช้ร่วมกันทุกวิธี — ตัวเลขเฉพาะ (ขนาดเข็ม, โดส) ให้ยึดฉลากวัคซีน ไม่ใส่ในนี้ กันใช้ผิด
const COMMON = [
  { icon: 'ti-snowflake', text: 'เก็บวัคซีนที่ 2–8°C ห้ามแช่แข็ง ห้ามโดนแดด และเขย่าเบา ๆ ก่อนดูด' },
  { icon: 'ti-file-description', text: 'โดส ขนาดเข็ม และ SC/IM ให้ยึดตามฉลากวัคซีนหรือคำแนะนำสัตวแพทย์' },
  { icon: 'ti-droplet', text: 'ตำแหน่งฉีดต้องแห้งและสะอาด — หมูเปียก/เปื้อนมูล เช็ดก่อน' },
  { icon: 'ti-clock', text: 'ฉีดแล้วบันทึกทันที และตรวจอาการหลังฉีดวันที่ 1, 3, 7 ตามที่ระบบเตือน' },
]

export default function VaccineGuidePage() {
  const [active, setActive] = useState(GUIDES[0].id)
  const [zoom, setZoom] = useState(null)   // ภาพที่กำลังดูเต็มจอ
  const g = GUIDES.find((x) => x.id === active) || GUIDES[0]

  // ปิดภาพเต็มจอด้วย Esc
  useEffect(() => {
    if (!zoom) return
    const onKey = (e) => { if (e.key === 'Escape') setZoom(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">วิธีฉีดวัคซีนสุกร · GUIDE</span>
          <Link to="/vaccine" className="vg-link"><i className="ti ti-arrow-left" aria-hidden="true" /> ไปหน้าบันทึกวัคซีน</Link>
        </div>
        <p className="vg-intro">เลือกตัวหมูที่จะฉีด แล้วดูตำแหน่งกับวิธีแทงเข็มที่ถูกต้อง — กดที่ภาพเพื่อดูเต็มจอ</p>

        {/* เลือกตัวหมู */}
        <div className="vg-tabs" role="tablist">
          {GUIDES.map((x) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={x.id === active}
              className={`vg-tab ${x.id === active ? 'on' : ''}`}
              onClick={() => setActive(x.id)}
            >
              <span className="vg-tab-who">{x.who}</span>
              <span className={`vg-route ${x.route.toLowerCase()}`}>{x.route} · {x.routeLabel}</span>
            </button>
          ))}
        </div>

        {/* ภาพ + คำอธิบาย */}
        <div className="vg-body">
          <button type="button" className="vg-img-btn" onClick={() => setZoom(g)} aria-label="ดูภาพเต็มจอ">
            <img src={g.img} alt={`ตำแหน่งฉีด ${g.routeLabel} สำหรับ${g.who}`} className="vg-img" />
            <span className="vg-zoom-hint"><i className="ti ti-zoom-in" aria-hidden="true" /> ดูเต็มจอ</span>
          </button>

          <div className="vg-text">
            <div className="vg-kv">
              <div className="vg-k"><i className="ti ti-map-pin" aria-hidden="true" /> ตำแหน่ง</div>
              <div className="vg-v">{g.spot}</div>
            </div>
            <div className="vg-kv">
              <div className="vg-k"><i className="ti ti-vaccine" aria-hidden="true" /> วิธีแทงเข็ม</div>
              <div className="vg-v">{g.how}</div>
            </div>
            <div className="vg-kv">
              <div className="vg-k"><i className="ti ti-bulb" aria-hidden="true" /> ทำไมต้องจุดนี้</div>
              <div className="vg-v">{g.why}</div>
            </div>
            <ul className="vg-tips">
              {g.tips.map((t) => <li key={t}><i className="ti ti-check" aria-hidden="true" /> {t}</li>)}
            </ul>
          </div>
        </div>
      </div>

      {/* เทียบ 3 แบบในจอเดียว — ไว้พิมพ์ติดหน้าเล้า */}
      <div className="panel">
        <div className="panel-head"><span className="panel-title">เทียบทั้ง 3 แบบ</span></div>
        <div className="vg-grid">
          {GUIDES.map((x) => (
            <button type="button" key={x.id} className={`vg-card ${x.id === active ? 'on' : ''}`} onClick={() => setActive(x.id)}>
              <img src={x.img} alt="" className="vg-card-img" loading="lazy" />
              <div className="vg-card-body">
                <div className="vg-card-who">{x.who}</div>
                <span className={`vg-route ${x.route.toLowerCase()}`}>{x.route}</span>
                <div className="vg-card-spot">{x.spot}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><span className="panel-title">ทุกครั้งที่ฉีด</span></div>
        <ul className="vg-common">
          {COMMON.map((c) => <li key={c.text}><i className={`ti ${c.icon}`} aria-hidden="true" /> {c.text}</li>)}
        </ul>
        <div className="vg-voice-tip">
          <i className="ti ti-microphone" aria-hidden="true" />
          ถาม AI ได้เลย: “ลูกหมูฉีดวัคซีนตรงไหน” · “ฉีดเข้ากล้ามฉีดตรงไหน” · หรือสั่ง “เปิดวิธีฉีดวัคซีน”
        </div>
      </div>

      {zoom && (
        <div className="vg-lightbox" onClick={() => setZoom(null)} role="dialog" aria-label="ภาพเต็มจอ">
          <img src={zoom.img} alt={`ตำแหน่งฉีด ${zoom.routeLabel} สำหรับ${zoom.who}`} />
          <button type="button" className="vg-lightbox-close" onClick={() => setZoom(null)} aria-label="ปิด">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  )
}

import { useState } from 'react'

// บัตรเชิญให้คนในฟาร์มแอดไลน์ฟาร์มมี่
//
// ขึ้นเฉพาะคนที่ล็อกอินแล้ว เพราะบัญชีไลน์นี้ส่งข้อมูลของฟาร์มเราโดยเฉพาะ
// (งานประจำวัน ชื่อคนรับผิดชอบ บันทึกวัคซีน สรุปฟาร์ม) ไม่ใช่ช่องทางสำหรับคนนอก
//
// อยากให้มีคิวอาร์ด้วย: เอารูปคิวอาร์ทางการจาก LINE OA Manager
// มาวางที่ frontend/public/line-qr.png แล้วมันจะขึ้นเอง ไม่มีไฟล์ก็ซ่อนไว้

export const LINE_ID = '@159xyfzc'
// ลิงก์เพิ่มเพื่อนมาตรฐานของ LINE — ต้องเข้ารหัส @ เป็น %40 ไม่งั้นบางเครื่องเปิดไม่ติด
export const LINE_ADD_URL = `https://line.me/R/ti/p/${encodeURIComponent(LINE_ID)}`

export default function LineAddCard() {
  // '' = ยังไม่กด · 'ok' = ก๊อปแล้ว · 'fail' = เบราว์เซอร์ไม่ให้ก๊อป
  const [copyState, setCopyState] = useState('')
  const [hasQr, setHasQr] = useState(true)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(LINE_ID)
      setCopyState('ok')
    } catch {
      // บางเบราว์เซอร์ไม่ให้ก๊อปถ้าไม่ได้เปิดผ่าน https หรือผู้ใช้ไม่ให้สิทธิ์
      // ต้องบอกให้รู้ ไม่งั้นกดแล้วไม่มีอะไรเกิดขึ้น ผู้ใช้จะนึกว่าปุ่มเสีย
      setCopyState('fail')
    }
    setTimeout(() => setCopyState(''), 2500)
  }

  const copyLabel = { ok: 'คัดลอกแล้ว', fail: 'คัดลอกไม่ได้ พิมพ์ตามได้เลย' }[copyState] || 'คัดลอกไอดี'
  const copyIcon = { ok: 'ti-check', fail: 'ti-alert-circle' }[copyState] || 'ti-copy'

  return (
    <section className="lnq">
      <div className="lnq-main">
        <div className="lnq-text">
          <h2><i className="ti ti-brand-line" aria-hidden="true" /> เพิ่มฟาร์มมี่ใน LINE</h2>
          <p>
            รับแจ้งเตือนวัคซีนที่ต้องฉีด งานประจำวันของแต่ละคน และสรุปฟาร์มทุกเย็น
            สำหรับคนในฟาร์มเท่านั้น เพราะข้อมูลที่ส่งเป็นของฟาร์มเราโดยเฉพาะ
          </p>

          <div className="lnq-id">
            <code>{LINE_ID}</code>
            <button type="button" onClick={copy} aria-label="คัดลอกไอดีไลน์">
              <i className={`ti ${copyIcon}`} aria-hidden="true" />
              {copyLabel}
            </button>
          </div>

          <a className="lnq-btn" href={LINE_ADD_URL} target="_blank" rel="noopener noreferrer">
            <i className="ti ti-user-plus" aria-hidden="true" /> เพิ่มเพื่อนใน LINE
          </a>
          <small className="lnq-hint">
            หรือเปิดแอป LINE → เพิ่มเพื่อน → ค้นหาด้วยไอดี แล้วพิมพ์ {LINE_ID}
          </small>
        </div>

        {hasQr && (
          <figure className="lnq-qr">
            <img src="/line-qr.png" alt={`คิวอาร์โค้ดสำหรับเพิ่มเพื่อน ${LINE_ID}`}
              onError={() => setHasQr(false)} />
            <figcaption>สแกนเพื่อเพิ่มเพื่อน</figcaption>
          </figure>
        )}
      </div>
    </section>
  )
}

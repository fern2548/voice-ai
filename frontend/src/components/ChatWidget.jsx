import { useEffect, useRef, useState } from 'react'
import { askAI } from '../api.js'

function speak(text) {
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'th-TH'
  u.rate = 1
  window.speechSynthesis.speak(u)
}

// ส่งประวัติแค่ไม่กี่เทิร์นล่าสุดให้ backend (backend ก็ตัดซ้ำอีกชั้น) — ประหยัด token/TPM
const SEND_TURNS = 6 // = 3 คู่ถาม-ตอบล่าสุด

const GREETING = { role: 'model', text: 'สวัสดีครับ! ถามเรื่องสภาพอากาศได้เลยครับ' }

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([GREETING])
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, open])

  const ask = async (text) => {
    const q = (text ?? question).trim()
    if (!q || busy) return
    setQuestion('')
    setBusy(true)

    // ประวัติที่ส่งไป = บทสนทนาก่อนหน้า (ไม่รวมข้อความทักทายเริ่มต้น) เอาแค่ SEND_TURNS ล่าสุด
    const history = messages
      .filter((m) => m !== GREETING)
      .slice(-SEND_TURNS)
      .map(({ role, text }) => ({ role, text }))

    setMessages((prev) => [...prev, { role: 'user', text: q }])
    try {
      const d = await askAI(q, history)
      setMessages((prev) => [...prev, { role: 'model', text: d.answer }])
      speak(d.answer)
    } catch {
      setMessages((prev) => [...prev, { role: 'model', text: 'ขออภัยครับ ตอนนี้เชื่อมต่อระบบไม่ได้ ลองใหม่อีกครั้งนะครับ' }])
    } finally {
      setBusy(false)
    }
  }

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert('Browser ไม่รองรับ กรุณาใช้ Chrome')
      return
    }
    const r = new SR()
    r.lang = 'th-TH'
    r.interimResults = false
    setListening(true)
    r.start()
    r.onresult = (e) => {
      const t = e.results[0][0].transcript
      setQuestion(t)
      setListening(false)
      ask(t)
    }
    r.onerror = () => setListening(false)
  }

  return (
    <>
      {open && (
        <div className="chat-pop">
          <div className="chat-pop-head">
            <span><i className="ti ti-robot" aria-hidden="true" style={{ marginRight: 6 }} />ผู้ช่วย AI</span>
            <button className="chat-pop-close" onClick={() => setOpen(false)} aria-label="ปิด">
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          </div>
          <div className="chat-thread" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>
            ))}
            {busy && <div className="chat-msg model dim">กำลังคิด…</div>}
          </div>
          <div className="input-row">
            <input
              className="chat-input"
              type="text"
              placeholder="พิมพ์ หรือกดไมค์…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask()}
            />
            <button
              className={`mic-btn ${listening ? 'listening' : ''}`}
              onClick={startVoice}
              aria-label="พูด"
            >
              <i className="ti ti-microphone" aria-hidden="true" />
            </button>
            <button className="ask-btn" onClick={() => ask()} disabled={busy}>ถาม</button>
          </div>
        </div>
      )}
      <button
        className={`chat-fab ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="ผู้ช่วย AI"
        aria-label="ผู้ช่วย AI"
      >
        <i className={`ti ${open ? 'ti-x' : 'ti-message-chatbot'}`} aria-hidden="true" />
      </button>
    </>
  )
}

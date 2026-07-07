import { useState } from 'react'
import { askAI } from '../api.js'

function speak(text) {
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'th-TH'
  u.rate = 1
  window.speechSynthesis.speak(u)
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('สวัสดีครับ! ถามเรื่องสภาพอากาศได้เลยครับ')
  const [listening, setListening] = useState(false)

  const ask = async (text) => {
    const q = (text ?? question).trim()
    if (!q) return
    setAnswer('กำลังคิด…')
    const d = await askAI(q)
    setAnswer(d.answer)
    speak(d.answer)
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
            <span>🤖 ผู้ช่วย AI</span>
            <button className="chat-pop-close" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="chat-answer">{answer}</div>
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
            >
              🎤
            </button>
            <button className="ask-btn" onClick={() => ask()}>ถาม</button>
          </div>
        </div>
      )}
      <button
        className={`chat-fab ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="ผู้ช่วย AI"
      >
        {open ? '✕' : '🤖'}
      </button>
    </>
  )
}

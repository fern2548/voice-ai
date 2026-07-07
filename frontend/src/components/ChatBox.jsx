import { useState } from 'react'
import { askAI } from '../api.js'

// อ่านออกเสียงคำตอบ (Web Speech API)
function speak(text) {
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'th-TH'
  u.rate = 1
  window.speechSynthesis.speak(u)
}

export default function ChatBox() {
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
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">ผู้ช่วยอัจฉริยะ · AI ASSISTANT</span>
      </div>
      <div className="chat-answer">{answer}</div>
      <div className="input-row">
        <input
          className="chat-input"
          type="text"
          placeholder="พิมพ์ หรือกดไมค์เพื่อพูด…"
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
        <button className="ask-btn" onClick={() => ask()}>
          ถาม
        </button>
      </div>
    </div>
  )
}

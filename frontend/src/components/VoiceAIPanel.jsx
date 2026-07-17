import { useEffect, useRef, useState } from 'react'
import { askAI } from '../api.js'
import { speak, isMuted, setMuted, listVoices, getSavedVoiceURI, setSavedVoiceURI } from '../utils/voice.js'

// ส่งประวัติแค่ไม่กี่เทิร์นล่าสุดให้ backend (backend ก็ตัดซ้ำอีกชั้น) — ประหยัด token/TPM
const SEND_TURNS = 6 // = 3 คู่ถาม-ตอบล่าสุด

const GREETING = { role: 'model', text: 'สวัสดีครับ! แตะช่องด้านล่างแล้วพูดถามเรื่องสภาพอากาศได้เลยครับ' }

function useVoiceList() {
  const [voices, setVoices] = useState(() => listVoices())
  useEffect(() => {
    const synth = window.speechSynthesis
    if (!synth) return
    const update = () => setVoices(listVoices())
    synth.addEventListener('voiceschanged', update)
    update()
    return () => synth.removeEventListener('voiceschanged', update)
  }, [])
  return voices
}

export default function VoiceAIPanel() {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([GREETING])
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [muted, setMutedState] = useState(() => isMuted())
  const [showVoiceMenu, setShowVoiceMenu] = useState(false)
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(() => getSavedVoiceURI())
  const scrollRef = useRef(null)
  const voices = useVoiceList()

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    setMutedState(next)
  }

  const changeVoice = (uri) => {
    setSavedVoiceURI(uri)
    setSelectedVoiceURI(uri)
  }

  const ask = async (text) => {
    const q = (text ?? question).trim()
    if (!q || busy) return
    setQuestion('')
    setBusy(true)

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
    r.onend = () => setListening(false)
  }

  return (
    <div className="voice-panel">
      <div className="voice-panel-head">
        <span><i className="ti ti-microphone-2" aria-hidden="true" style={{ marginRight: 8 }} />Voice AI ผู้ช่วยสภาพอากาศ</span>
        <div className="chat-pop-actions">
          <button
            className="chat-pop-icon-btn"
            onClick={() => setShowVoiceMenu((v) => !v)}
            aria-label="ตั้งค่าเสียง"
            title="ตั้งค่าเสียง"
          >
            <i className="ti ti-settings" aria-hidden="true" />
          </button>
          <button
            className="chat-pop-icon-btn"
            onClick={toggleMute}
            aria-label={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
            title={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
          >
            <i className={`ti ${muted ? 'ti-volume-off' : 'ti-volume'}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {showVoiceMenu && (
        <div className="voice-menu">
          <label className="voice-menu-label">เสียงอ่านคำตอบ</label>
          <select
            className="voice-menu-select"
            value={selectedVoiceURI}
            onChange={(e) => changeVoice(e.target.value)}
            disabled={voices.length === 0}
          >
            {voices.length === 0 ? (
              <option value="">ไม่พบเสียงในเบราว์เซอร์นี้</option>
            ) : (
              voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))
            )}
          </select>
        </div>
      )}

      <button
        className={`voice-box ${listening ? 'listening' : ''} ${busy ? 'busy' : ''}`}
        onClick={startVoice}
        disabled={busy}
      >
        <i className="ti ti-microphone" aria-hidden="true" />
        <span className="voice-box-text">
          {busy ? 'กำลังคิด…' : listening ? 'กำลังฟัง… พูดได้เลยครับ' : 'แตะที่นี่แล้วพูดถามเรื่องสภาพอากาศ'}
        </span>
      </button>

      <div className="input-row voice-panel-typerow">
        <input
          className="chat-input"
          type="text"
          placeholder="หรือพิมพ์คำถามที่นี่…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
        />
        <button className="ask-btn" onClick={() => ask()} disabled={busy}>ถาม</button>
      </div>

      <div className="chat-thread voice-panel-thread" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>
        ))}
        {busy && <div className="chat-msg model dim">กำลังคิด…</div>}
      </div>
    </div>
  )
}

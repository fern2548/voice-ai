import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVoiceAI } from '../context/VoiceAI.jsx'
import { HeroWave, HeroRibbons } from './FarmDecor.jsx'

// ปุ่มลัด — บางอันพาไปหน้าอื่น บางอันถาม AI ให้เลย
const QUICK_ACTIONS = [
  { icon: 'ti-home', tone: 'blue', text: 'เปิดโรงเรือน', to: '/pig-log' },
  { icon: 'ti-heartbeat', tone: 'pink', text: 'เช็กหมูป่วย', ask: 'วันนี้หมูป่วยกี่ตัว' },
  { icon: 'ti-vaccine', tone: 'cyan', text: 'บันทึกวัคซีน', to: '/vaccine' },
  { icon: 'ti-file-analytics', tone: 'purple', text: 'ดูรายงาน', to: '/history' },
]

export default function VoiceAIPanel() {
  const [showVoiceMenu, setShowVoiceMenu] = useState(false)
  const {
    question, setQuestion, messages, listening, busy,
    muted, toggleMute, selectedVoiceURI, changeVoice, voices,
    ask, startVoice, voiceError,
  } = useVoiceAI()
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  return (
    <div className="voice-hero">
      <HeroRibbons />
      <h1 className="hero-title">Farmy Voice</h1>
      <div className="hero-tagline">Voice AI สำหรับฟาร์มหมูอัจฉริยะ</div>
      <div className="hero-sub">ถามข้อมูลภายในฟาร์ม หรือให้พาไปยังหน้าต่างๆ ได้ด้วยเสียง</div>

      <div className="voice-ptt-stage">
        <HeroWave side="left" active={listening} />

        <button
          className={`voice-ptt ${listening ? 'listening' : ''} ${busy ? 'busy' : ''}`}
          onClick={startVoice}
          disabled={busy}
          aria-label="เริ่มสนทนา"
        >
          <span className="voice-ptt-mic" aria-hidden="true">
            <span className="mic-dot-ring" />
            <i className="ti ti-microphone" />
          </span>
          <span className="voice-ptt-text">
            {busy ? 'กำลังคิด…' : listening ? 'กำลังฟัง…' : 'คุยกับ Farmy Voice'}
          </span>
          <i className="ti ti-chevron-right voice-ptt-arrow" aria-hidden="true" />
        </button>

        <HeroWave side="right" active={listening} />
      </div>
      <span className="ptt-reflection" aria-hidden="true" />

      {listening && (
        <div className="voice-ptt-hint">
          <span className="voice-ptt-dot" />
          กำลังฟังอยู่… แตะอีกครั้งเพื่อหยุด
        </div>
      )}

      <div className="voice-quick-row">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.text}
            className={`voice-quick-chip tone-${a.tone}`}
            disabled={busy}
            onClick={() => (a.to ? navigate(a.to) : ask(a.ask))}
          >
            <span className="quick-chip-icon"><i className={`ti ${a.icon}`} aria-hidden="true" /></span>
            <span className="quick-chip-label">{a.text}</span>
          </button>
        ))}
      </div>

      <div className="voice-inputbar">
        <i className="ti ti-wave-sine voice-inputbar-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          className="voice-inputbar-input"
          type="text"
          placeholder="พูดหรือพิมพ์คำสั่งได้เลยครับ"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
        />
        {/* ปุ่มไมค์อยู่ตลอด (กดซ้ำเพื่อหยุดฟังได้) ส่วนปุ่มส่งจะโผล่เพิ่มเมื่อมีข้อความแล้ว */}
        <button
          className={`voice-inputbar-mic ${listening ? 'listening' : ''}`}
          onClick={startVoice}
          disabled={busy}
          aria-label={listening ? 'หยุดฟัง' : 'พูด'}
        >
          <i className={`ti ${listening ? 'ti-player-stop-filled' : 'ti-microphone'}`} aria-hidden="true" />
        </button>
        {question.trim() && (
          <button
            className="voice-inputbar-send"
            onClick={() => ask()}
            disabled={busy}
            aria-label="ส่งคำถาม"
          >
            <i className="ti ti-send" aria-hidden="true" />
            <span>ส่ง</span>
          </button>
        )}
      </div>

      {voiceError && (
        <div className="voice-error">
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          {voiceError}
        </div>
      )}

      <div className="voice-hero-tools">
        <button className="voice-mute-toggle" onClick={() => setShowVoiceMenu((v) => !v)}>
          <i className="ti ti-settings" aria-hidden="true" /> ตั้งค่าเสียง
        </button>
        <button className="voice-mute-toggle" onClick={toggleMute}>
          <i className={`ti ${muted ? 'ti-volume-off' : 'ti-volume'}`} aria-hidden="true" />
          {muted ? 'เปิดเสียงตอบ' : 'ปิดเสียงตอบ'}
        </button>
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

      {messages.length > 1 && (
        <div className="chat-thread voice-hero-thread" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>
          ))}
          {busy && <div className="chat-msg model dim">กำลังคิด…</div>}
        </div>
      )}
    </div>
  )
}

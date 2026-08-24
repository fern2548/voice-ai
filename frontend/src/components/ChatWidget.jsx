import { useEffect, useRef, useState } from 'react'
import { useVoiceAI } from '../context/VoiceAI.jsx'

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [showVoiceMenu, setShowVoiceMenu] = useState(false)
  const {
    question, setQuestion, messages, listening, busy,
    muted, toggleMute, selectedVoiceURI, changeVoice, voices,
    ask, startVoice,
  } = useVoiceAI()
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, open])

  return (
    <>
      {open && (
        <div className="chat-pop">
          <div className="chat-pop-head">
            <span><i className="ti ti-robot" aria-hidden="true" style={{ marginRight: 6 }} />ผู้ช่วย AI</span>
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
              <button className="chat-pop-close" onClick={() => setOpen(false)} aria-label="ปิด">
                <i className="ti ti-x" aria-hidden="true" />
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

          <div className="chat-thread" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>
            ))}
            {busy && <div className="chat-msg model dim">กำลังคิด…</div>}
          </div>
          <div className="input-row">
            <input
              ref={inputRef}
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

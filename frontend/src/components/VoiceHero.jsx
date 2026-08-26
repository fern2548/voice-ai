import { Link } from 'react-router-dom'
import { useVoiceAI } from '../context/VoiceAI.jsx'

/**
 * หน้าแรก — ยกโครงมาจากเว็บ Farmy Voice (พอร์ต 5174) ทั้งดุ้น
 * ต่างกันแค่ตรงนี้ต่อกับ AI จริง (Gemini -> Ollama -> rule-based ผ่าน /ask)
 * ส่วนของ 5174 เป็นคำตอบจำลอง
 *
 * โครง: จอเดียวจบ ไม่มีอะไรให้เลื่อน
 *   แสงเขียวนุ่ม ๆ ก้อนเดียว -> หัวข้อบรรทัดเดียว -> บรรทัดรอง -> แคปซูลรับคำสั่ง -> พื้นที่คำตอบ
 */
export default function VoiceHero() {
  const {
    question, setQuestion, messages, listening, busy,
    ask, startVoice, voiceError,
  } = useVoiceAI()

  const ready = question.trim().length > 0 && !busy

  const submit = (e) => {
    e.preventDefault()
    if (!ready) return
    ask(question.trim())
  }

  // สถานะที่แสดงใต้แคปซูล ใช้ถ้อยคำชุดเดียวกับ 5174
  const statusText = listening ? 'กำลังฟัง...' : busy ? 'กำลังคิด...' : ''

  // คำถามล่าสุดของผู้ใช้ และคำตอบล่าสุดของ AI
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  const lastBot = [...messages].reverse().find((m) => m.role !== 'user')
  const showThread = messages.length > 1

  return (
    <section className="vh-hero">
      <div className="vh-glow" aria-hidden="true" />

      <div className="vh-inner">
        <h1 className="vh-title">Farmy Voice ผู้ช่วยเสียงประจำฟาร์มของคุณ</h1>
        <p className="vh-sub">ถามข้อมูล สั่งงาน และเข้าถึงฟาร์ม ด้วยเสียงของคุณ</p>

        {/* แคปซูลรับคำสั่ง */}
        <form className="vh-bar-wrap" onSubmit={submit}>
          <div className={`vh-bar ${listening ? 'listening' : ''}`}>
            <i className="ti ti-plus vh-bar-plus" aria-hidden="true" />

            {listening ? (
              <div className="vh-wave" aria-hidden="true">
                {[10, 20, 13, 28, 17, 24, 12, 22, 15, 26, 11, 18].map((h, i) => (
                  <span key={i} style={{ height: h, animationDelay: `${(i % 5) * 0.1}s` }} />
                ))}
              </div>
            ) : (
              <input
                className="vh-input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={busy}
                placeholder="ถาม Farmy Voice หรือแตะไมโครโฟนเพื่อพูด"
                aria-label="ถาม Farmy Voice"
              />
            )}

            {ready ? (
              <button type="submit" className="vh-send" aria-label="ส่งคำถาม">
                <i className="ti ti-arrow-up" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                className={`vh-mic ${listening ? 'on' : ''}`}
                onClick={startVoice}
                disabled={busy && !listening}
                aria-label={listening ? 'กำลังฟัง' : 'พูดกับ Farmy Voice'}
              >
                <i className="ti ti-microphone" aria-hidden="true" />
              </button>
            )}
          </div>
        </form>

        {/* พื้นที่สถานะ + คำถาม + คำตอบ ความสูงคงที่ ไม่ทำให้หน้ากระโดด */}
        <div className="vh-thread">
          {statusText && <p className="vh-status">{statusText}</p>}
          {voiceError && <p className="vh-error">{voiceError}</p>}

          {showThread && lastUser && <p className="vh-q">“{lastUser.text}”</p>}
          {showThread && lastBot && <p className="vh-a">{lastBot.text}</p>}
        </div>
      </div>

      <p className="vh-foot">
        Farmy Voice เป็น AI และอาจให้ข้อมูลคลาดเคลื่อนได้ ·{' '}
        <Link to="/features" className="vh-foot-link">ดูว่าทำอะไรได้บ้าง</Link>
      </p>
    </section>
  )
}

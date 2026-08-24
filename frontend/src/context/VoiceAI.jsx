import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { askAI } from '../api.js'
import { speak, isMuted, setMuted, listVoices, getSavedVoiceURI, setSavedVoiceURI } from '../utils/voice.js'
import { createRecognizer, pickBestTranscript } from '../utils/speech.js'

// ส่งประวัติแค่ไม่กี่เทิร์นล่าสุดให้ backend (backend ก็ตัดซ้ำอีกชั้น) — ประหยัด token/TPM
const SEND_TURNS = 6 // = 3 คู่ถาม-ตอบล่าสุด

const GREETING = { role: 'model', text: 'สวัสดีครับ! ถามฟาร์มมี่เรื่องสภาพอากาศได้เลยครับ' }

const VoiceAIContext = createContext(null)

export function VoiceAIProvider({ children }) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([GREETING])
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [muted, setMutedState] = useState(() => isMuted())
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(() => getSavedVoiceURI())
  const [voices, setVoices] = useState(() => listVoices())
  const [voiceError, setVoiceError] = useState('')
  const recognizerRef = useRef(null)

  useEffect(() => {
    const synth = window.speechSynthesis
    if (!synth) return
    const update = () => setVoices(listVoices())
    synth.addEventListener('voiceschanged', update)
    update()
    return () => synth.removeEventListener('voiceschanged', update)
  }, [])

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

  // ข้อความแจ้งเตือนตอนฟังเสียงมีปัญหา (ไม่งั้นจะเงียบไปเฉย ๆ ผู้ใช้ไม่รู้ว่าเกิดอะไรขึ้น)
  const ERROR_TEXT = {
    'not-allowed': 'เบราว์เซอร์ไม่อนุญาตให้ใช้ไมโครโฟน — กดไอคอนรูปกุญแจ/ไมค์บนแถบที่อยู่เว็บ แล้วอนุญาตไมโครโฟน',
    'service-not-allowed': 'เบราว์เซอร์ไม่อนุญาตให้ใช้ไมโครโฟน — ตรวจสอบการตั้งค่าสิทธิ์ไมค์',
    'no-speech': 'ไม่ได้ยินเสียงพูดครับ ลองพูดใหม่อีกครั้ง',
    'audio-capture': 'ไม่พบไมโครโฟน — ตรวจสอบว่าเสียบไมค์อยู่ไหม',
    'network': 'เชื่อมต่อบริการแปลงเสียงไม่ได้ ตรวจสอบอินเทอร์เน็ต',
  }

  const startVoice = () => {
    // ถ้ากำลังฟังอยู่ ให้กดซ้ำเพื่อ "หยุดฟัง" เอง (continuous mode ไม่หยุดเองทันทีที่เว้นวรรค)
    if (recognizerRef.current) {
      recognizerRef.current.stop()
      return
    }
    const r = createRecognizer()
    if (!r) {
      setVoiceError('เบราว์เซอร์นี้ไม่รองรับการฟังเสียง กรุณาใช้ Google Chrome')
      return
    }
    recognizerRef.current = r
    setVoiceError('')
    setListening(true)
    try {
      r.start()
    } catch (e) {
      recognizerRef.current = null
      setListening(false)
      setVoiceError('เริ่มฟังเสียงไม่สำเร็จ ลองใหม่อีกครั้ง')
      return
    }
    r.onresult = (e) => {
      const t = pickBestTranscript(e.results)
      setQuestion(t)
    }
    r.onerror = (e) => {
      recognizerRef.current = null
      setListening(false)
      setVoiceError(ERROR_TEXT[e?.error] || `ฟังเสียงไม่สำเร็จ (${e?.error || 'ไม่ทราบสาเหตุ'})`)
    }
    r.onend = () => {
      recognizerRef.current = null
      setListening(false)
    }
  }

  const value = {
    question, setQuestion, messages, listening, busy,
    muted, toggleMute, selectedVoiceURI, changeVoice, voices,
    ask, startVoice, voiceError, setVoiceError,
  }

  return <VoiceAIContext.Provider value={value}>{children}</VoiceAIContext.Provider>
}

export function useVoiceAI() {
  const ctx = useContext(VoiceAIContext)
  if (!ctx) throw new Error('useVoiceAI must be used within VoiceAIProvider')
  return ctx
}

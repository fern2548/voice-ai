import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { handleVoiceCommand, routeQuestion } from '../services/voiceCommandService.js'
import { askLocalAI } from '../services/localAIService.js'
import { askGemini } from '../services/geminiService.js'

// ข้อความประจำแต่ละสถานะ — ใช้ร่วมกันทุกที่ที่แสดงสถานะเสียง
export const VOICE_STATUS = {
  idle: 'พร้อมรับคำสั่ง',
  listening: 'กำลังฟัง...',
  thinking: 'กำลังคิด...',
  answering: 'Farmy Voice กำลังตอบ',
  complete: 'เรียบร้อยค่ะ',
}

// ประโยคตัวอย่างที่ระบบจะ "ได้ยิน" (จำลอง STT — ต่อ Web Speech API ทีหลังได้)
const SAMPLE_UTTERANCES = [
  'พาไปหน้าโรงเรือน',
  'โรงเรือน 3 มีหมูป่วยกี่ตัว',
  'วัคซีนล่าสุดฉีดเมื่อไหร่',
  'เปิดรายงานวันนี้',
  'อุณหภูมิโรงเรือน 2 เท่าไหร่',
  'PRRS คืออะไร',
]

/**
 * สเตตแมชชีนของการสนทนาด้วยเสียง
 * idle -> listening -> thinking -> answering -> complete -> idle
 */
export function useVoiceSession() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle')
  const [transcript, setTranscript] = useState('')
  const [result, setResult] = useState(null)
  const timers = useRef([])

  const later = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms)
    timers.current.push(id)
    return id
  }, [])

  // เคลียร์ timer ทั้งหมดตอน unmount กัน setState หลังถอด component
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const run = useCallback(
    async (text) => {
      setTranscript(text)
      setResult(null)
      setStatus('thinking')

      const intent = handleVoiceCommand(text)

      if (intent.type === 'navigate') {
        later(() => {
          setStatus('answering')
          setResult({ navigateTo: intent.path, label: intent.label })
          later(() => {
            setStatus('complete')
            later(() => navigate(intent.path), 700)
          }, 900)
        }, 900)
        return
      }

      const engine = routeQuestion(text)
      const answer = engine === 'local' ? await askLocalAI(text) : await askGemini(text)

      setStatus('answering')
      setResult(answer)
      later(() => setStatus('complete'), 1400)
      later(() => {
        setStatus('idle')
        setResult(null)
        setTranscript('')
      }, 7000)
    },
    [later, navigate]
  )

  const start = useCallback(() => {
    if (status !== 'idle' && status !== 'complete') return
    setResult(null)
    setTranscript('')
    setStatus('listening')
    const picked = SAMPLE_UTTERANCES[Math.floor(Math.random() * SAMPLE_UTTERANCES.length)]
    later(() => run(picked), 1900)
  }, [status, later, run])

  const ask = useCallback(
    (text) => {
      const clean = String(text || '').trim()
      if (!clean) return
      if (status === 'listening' || status === 'thinking') return
      run(clean)
    },
    [status, run]
  )

  const busy = status === 'listening' || status === 'thinking' || status === 'answering'

  return { status, statusText: VOICE_STATUS[status], transcript, result, busy, start, ask }
}

export default useVoiceSession

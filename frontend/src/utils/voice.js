// จัดการเสียงพูด (Text-to-Speech) ของผู้ช่วย AI — เลือกเสียง + เปิด/ปิดเสียง
// ค่าที่เลือกไว้จะถูกจำไว้ใน localStorage ข้ามเซสชัน

const MUTED_KEY = 'voice-ai-muted'
const VOICE_KEY = 'voice-ai-voice-uri'

export function isMuted() {
  return localStorage.getItem(MUTED_KEY) === '1'
}

export function setMuted(muted) {
  localStorage.setItem(MUTED_KEY, muted ? '1' : '0')
  if (muted) window.speechSynthesis?.cancel()
}

export function getSavedVoiceURI() {
  return localStorage.getItem(VOICE_KEY) || ''
}

export function setSavedVoiceURI(uri) {
  localStorage.setItem(VOICE_KEY, uri || '')
}

// เสียงไทยมาก่อนเสมอ ตามด้วยเสียงอื่น ๆ ที่เบราว์เซอร์มี
export function listVoices() {
  const all = window.speechSynthesis?.getVoices() || []
  const th = all.filter((v) => v.lang?.toLowerCase().startsWith('th'))
  const rest = all.filter((v) => !v.lang?.toLowerCase().startsWith('th'))
  return [...th, ...rest]
}

function pickVoice() {
  const voices = listVoices()
  if (voices.length === 0) return null
  const savedURI = getSavedVoiceURI()
  return voices.find((v) => v.voiceURI === savedURI) || voices[0]
}

export function speak(text) {
  if (isMuted() || !window.speechSynthesis) return
  window.speechSynthesis.cancel() // กันเสียงซ้อนกันถ้าพูดยังไม่จบแล้วมีคำตอบใหม่
  const u = new SpeechSynthesisUtterance(text)
  const voice = pickVoice()
  if (voice) {
    u.voice = voice
    u.lang = voice.lang
  } else {
    u.lang = 'th-TH'
  }
  u.rate = 1
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel()
}

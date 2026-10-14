// จัดการเสียงพูด (Text-to-Speech) ของผู้ช่วย AI
//
// ใช้ 2 ชั้น เรียงตามคุณภาพเสียง
//   1. เสียงไทยของ CPF  — ขอผ่าน /tts ของเซิร์ฟเวอร์เรา ได้ลิงก์ไฟล์ .wav มาเล่น
//      (คีย์อยู่ที่เซิร์ฟเวอร์ ไม่หลุดมาอยู่ในเบราว์เซอร์)
//   2. เสียงสังเคราะห์ของเบราว์เซอร์ — ใช้เมื่อชั้นแรกไม่สำเร็จ
//      บนหลายเครื่องอ่านไทยได้แย่มาก จึงเป็นแค่ตัวสำรอง ไม่ใช่ตัวหลัก
//
// ค่าที่เลือกไว้ (ปิดเสียง / เสียงที่เลือก) จำไว้ใน localStorage ข้ามเซสชัน

import { apiUrl, OFFLINE } from '../config.js'

const MUTED_KEY = 'voice-ai-muted'
const VOICE_KEY = 'voice-ai-voice-uri'

// รอเสียงจากเซิร์ฟเวอร์นานสุดเท่านี้ เกินกว่านี้ใช้เสียงเบราว์เซอร์ไปก่อน
// ผู้ใช้พูดเสร็จแล้วรอเงียบ ๆ เกิน 12 วิจะนึกว่าระบบค้าง
const TTS_TIMEOUT_MS = 12000

export function isMuted() {
  return localStorage.getItem(MUTED_KEY) === '1'
}

export function setMuted(muted) {
  localStorage.setItem(MUTED_KEY, muted ? '1' : '0')
  if (muted) stopSpeaking()
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

// ---------- เสียงของเบราว์เซอร์ (ตัวสำรอง) ----------
function speakWithBrowser(text) {
  if (!window.speechSynthesis) return
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

// ---------- เสียงไทยของ CPF (ตัวหลัก) ----------
// นับรอบการพูด ถ้ามีคำตอบใหม่เข้ามาระหว่างที่ยังเล่นอยู่ รอบเก่าจะหยุดเอง
let playToken = 0
let audioEl = null

function stopAudio() {
  if (!audioEl) return
  audioEl.pause()
  audioEl.src = ''
  audioEl = null
}

async function fetchVoiceUrls(text) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TTS_TIMEOUT_MS)
  try {
    const res = await fetch(apiUrl('/tts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: ctrl.signal,
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data?.urls) ? data.urls : []
  } finally {
    clearTimeout(timer)
  }
}

/** เล่นไฟล์เสียงทีละท่อนตามลำดับ — คืน false ถ้าเล่นไม่ได้สักท่อน */
async function playUrls(urls, token) {
  let played = 0
  for (const url of urls) {
    if (token !== playToken) return true // มีคำตอบใหม่มาแทนแล้ว ถือว่าจบงานนี้
    const ok = await new Promise((resolve) => {
      const a = new Audio(url)
      audioEl = a
      a.onended = () => resolve(true)
      a.onerror = () => resolve(false)
      a.play().catch(() => resolve(false))
    })
    if (ok) played += 1
  }
  stopAudio()
  return played > 0
}

/**
 * พูดข้อความออกเสียง — ลองเสียงไทยของ CPF ก่อน ไม่ได้ค่อยใช้เสียงเบราว์เซอร์
 * เรียกแบบไม่ต้อง await ได้ ฝั่งที่เรียกไม่ต้องรอเสียงเล่นจบ
 */
export async function speak(text) {
  const say = (text || '').trim()
  if (!say || isMuted()) return

  stopSpeaking()                 // หยุดของเดิมก่อนเสมอ (เพิ่ม playToken ข้างใน)
  const token = playToken

  if (!OFFLINE) {
    try {
      const urls = await fetchVoiceUrls(say)
      if (token !== playToken) return      // ถูกแทนที่ระหว่างรอเซิร์ฟเวอร์
      if (urls.length && await playUrls(urls, token)) return
    } catch {
      // ขอเสียงไม่สำเร็จ (เน็ตหลุด/หมดเวลา/เซิร์ฟเวอร์ยังไม่รองรับ) — ใช้ตัวสำรองต่อ
    }
  }

  if (token !== playToken) return
  speakWithBrowser(say)
}

export function stopSpeaking() {
  playToken += 1
  stopAudio()
  window.speechSynthesis?.cancel()
}

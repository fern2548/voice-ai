// กล่องถาม-ตอบของฟาร์มมี่ สำหรับเอาไปฝังในแดชบอร์ดอื่น
//
// วิธีใช้ในหน้าปลายทาง (บรรทัดเดียว):
//   <script src="https://fern.plotnexuslab.com/embed/farmy-ask.js"
//           data-server="https://fern.plotnexuslab.com"></script>
//
// ตัวเลือกเพิ่มเติมที่ใส่เป็น data-* ได้:
//   data-position="left"        มุมซ้ายแทนมุมขวา
//   data-title="ถามฟาร์มมี่"     ชื่อบนหัวกล่อง
//   data-open="1"               เปิดกล่องค้างไว้ตั้งแต่โหลดหน้า
//   data-mount="#someDiv"       ฝังลงในกล่องที่ระบุแทนที่จะลอยอยู่มุมจอ
//
// ทำไมเขียนเป็น JS เปล่า ไม่ใช้ React:
//   หน้าปลายทางเป็นแดชบอร์ดคนละตัว อาจมี React คนละเวอร์ชันหรือไม่มีเลย
//   ไฟล์นี้จึงต้องไม่พึ่งอะไรในหน้านั้นเลย และใช้ Shadow DOM กัน CSS ชนกันทั้งสองทาง
//
// ข้อมูลโรคกับตัวจับคำอาการ ใช้ไฟล์เดียวกับเว็บหลัก (src/data/*) ไม่ได้ก๊อปมาไว้ซ้ำ
// แก้คำอาการหรือเพิ่มรูปที่เดียว กล่องนี้ได้ตามไปด้วยตอน build

import { matchSymptoms, OBSERVE_MORE, NO_IMAGE_NOTE } from '../src/data/symptomIndex.js'
import { findDisease } from '../src/data/diseases.js'

const SELF = document.currentScript
const CFG = {
  server: (SELF?.dataset.server || new URL(SELF?.src || location.href).origin).replace(/\/+$/, ''),
  position: SELF?.dataset.position === 'left' ? 'left' : 'right',
  title: SELF?.dataset.title || 'ถามฟาร์มมี่',
  open: SELF?.dataset.open === '1',
  mount: SELF?.dataset.mount || '',
}

const CSS = `
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; }
.wrap { font-family: "IBM Plex Sans Thai", "Noto Sans Thai", system-ui, sans-serif; color: #17241d; }
.fab { position: fixed; bottom: 22px; ${CFG.position}: 22px; width: 58px; height: 58px; border-radius: 50%;
  border: 0; cursor: pointer; background: #1f9d63; color: #fff; font-size: 26px; line-height: 1;
  box-shadow: 0 6px 20px rgba(0,0,0,.22); z-index: 2147483000; }
.fab:hover { background: #1b8856; }
.panel { position: fixed; bottom: 92px; ${CFG.position}: 22px; width: min(420px, calc(100vw - 32px));
  max-height: min(640px, calc(100vh - 130px)); background: #fff; border-radius: 16px;
  border: 1px solid #e3e8e5; box-shadow: 0 16px 48px rgba(0,0,0,.18); z-index: 2147483000;
  display: none; flex-direction: column; overflow: hidden; }
.panel.on { display: flex; }
/* โหมดฝังในกล่องของหน้าปลายทาง ไม่ลอยอยู่มุมจอ */
.inline .panel { position: static; width: 100%; max-height: none; height: 100%; box-shadow: none;
  display: flex; bottom: auto; }
.inline .fab { display: none; }
.head { display: flex; align-items: center; gap: 8px; padding: 13px 15px; border-bottom: 1px solid #eef2f0;
  background: #f6faf8; }
.head b { font-size: 15px; font-weight: 700; flex: 1; }
.head button { background: none; border: 0; cursor: pointer; font-size: 20px; color: #7b8a83; line-height: 1; }
.body { flex: 1; overflow-y: auto; padding: 14px 15px; min-height: 90px; }
.hint { font-size: 13px; color: #7b8a83; line-height: 1.7; }
.hint b { display: block; color: #17241d; margin-bottom: 4px; font-size: 13.5px; }
.q { font-size: 12.5px; color: #7b8a83; margin: 0 0 6px; }
.a { font-size: 14.5px; line-height: 1.75; white-space: pre-wrap; margin: 0; }
.warn { display: flex; gap: 7px; align-items: flex-start; margin-top: 12px; padding: 10px 12px;
  border-radius: 10px; background: #fff6e8; border: 1px solid #f3dfbe; font-size: 12px; line-height: 1.6; }
.card { margin-top: 12px; border: 1px solid #e3e8e5; border-radius: 12px; padding: 11px 12px; }
.card.red { border-left: 4px solid #d9453f; }
.card.amber { border-left: 4px solid #d98324; }
.card.pink { border-left: 4px solid #d1568a; }
.card h4 { margin: 0; font-size: 14.5px; }
.card small { color: #7b8a83; font-size: 11.5px; }
.imgs { display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 9px; }
.imgs img { width: 100%; border-radius: 8px; border: 1px solid #e3e8e5; background: #f7f3ef; display: block;
  cursor: zoom-in; }
.obs { margin: 9px 0 0; padding-left: 17px; }
.obs li { font-size: 12.5px; line-height: 1.6; color: #4a5a52; }
.others { margin-top: 10px; font-size: 12.5px; color: #4a5a52; line-height: 1.6; }
.others b { color: #17241d; }
.foot { display: flex; gap: 7px; padding: 11px 12px; border-top: 1px solid #eef2f0; background: #fafcfb; }
.foot input { flex: 1; min-width: 0; font: inherit; font-size: 14px; padding: 9px 12px; border-radius: 10px;
  border: 1px solid #dfe6e2; outline: none; background: #fff; color: inherit; }
.foot input:focus { border-color: #1f9d63; }
.foot button { border: 0; cursor: pointer; width: 38px; height: 38px; border-radius: 10px; flex: none;
  background: #1f9d63; color: #fff; font-size: 17px; }
.foot button:disabled { opacity: .5; cursor: default; }
.foot button.mic { background: #eaf4ef; color: #1f9d63; }
.foot button.mic.on { background: #d9453f; color: #fff; }
.zoom { position: fixed; inset: 0; background: rgba(0,0,0,.82); z-index: 2147483001; display: grid;
  place-items: center; padding: 20px; cursor: zoom-out; }
.zoom img { max-width: 100%; max-height: 100%; border-radius: 10px; }
@media (prefers-color-scheme: dark) {
  .panel { background: #141a17; border-color: #2a332e; }
  .wrap { color: #e7efe9; }
  .head { background: #19211c; border-color: #2a332e; }
  .head b { color: #e7efe9; }
  .foot { background: #19211c; border-color: #2a332e; }
  .foot input { background: #141a17; border-color: #2a332e; color: #e7efe9; }
  .card, .imgs img { border-color: #2a332e; }
  .obs li, .others { color: #aebbb4; }
  .others b, .card h4 { color: #e7efe9; }
  .warn { background: #2a2113; border-color: #4a3a1c; color: #e7d6b4; }
}
`

const EXAMPLES = [
  'หมูมีตุ่มแดงขึ้น เป็นโรคอะไรได้บ้าง',
  'อาการโรคอหิวาต์แอฟริกา',
  'ฉีดวัคซีนตรงไหนของตัวหมู',
  'อุณหภูมิในโรงเรือนควรเท่าไหร่',
]

const el = (tag, cls, html) => {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (html != null) n.innerHTML = html
  return n
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/** ตัดสัญลักษณ์ Markdown ออกก่อนให้เสียงอ่าน ไม่งั้นมันอ่านว่า "ดอกจันดอกจัน" */
const strip = (t) => (t || '')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/https?:\/\/\S+/g, '')
  .replace(/[*_`#>]/g, '')
  .replace(/^\s*[-•]\s+/gm, '')
  .trim()

function build() {
  const host = el('div')
  host.style.all = 'initial'
  const root = host.attachShadow({ mode: 'open' })
  root.appendChild(el('style', null, CSS))

  const wrap = el('div', 'wrap')
  const fab = el('button', 'fab', '💬')
  fab.title = CFG.title
  const panel = el('div', 'panel')
  const body = el('div', 'body')
  const input = el('input')
  input.type = 'text'
  input.placeholder = 'พิมพ์คำถาม หรือกดไมค์เพื่อพูด'
  const send = el('button', 'send', '➤')
  const mic = el('button', 'mic', '🎤')

  const head = el('div', 'head')
  head.appendChild(el('b', null, esc(CFG.title)))
  const close = el('button', null, '✕')
  close.title = 'ปิด'
  head.appendChild(close)

  const foot = el('div', 'foot')
  foot.append(input, mic, send)
  panel.append(head, body, foot)
  wrap.append(fab, panel)
  root.appendChild(wrap)

  return { host, root, wrap, fab, panel, body, input, send, mic, close }
}

function renderCards(body, sym) {
  if (!sym) return
  const note = el('div', 'warn')
  note.innerHTML = '⚠️ <span>' + (sym.named
    ? 'ภาพอาการและจุดที่ต้องสังเกตของโรคนี้อยู่ด้านล่าง '
    : sym.broad
      ? 'อาการนี้พบได้ในหลายโรค ลองเทียบภาพด้านล่างกับที่เห็นจริงในคอก '
      : 'อาการที่บอกมาเข้าได้กับโรคด้านล่าง ')
    + '<b>เป็นการตั้งข้อสังเกตเท่านั้น</b> การยืนยันโรคต้องให้สัตวแพทย์ตรวจ</span>'
  body.appendChild(note)

  for (const m of sym.cards || []) {
    const d = findDisease(m.id)
    if (!d) continue
    const card = el('div', 'card ' + (d.tone || ''))
    card.appendChild(el('h4', null, esc(d.name) + ' <small>' + esc(d.en || '') + '</small>'))

    // เอาภาพของอาการที่ผู้ใช้พูดถึงขึ้นก่อน แล้วต่อด้วยจุดอื่นของโรคเดียวกันจนครบ
    const picked = (m.signs || []).map((id) => (d.signs || []).find((s) => s.id === id)).filter(Boolean)
    const rest = (d.signs || []).filter((s) => !picked.includes(s))
    const shown = [...picked, ...rest]
    if (shown.length) {
      const imgs = el('div', 'imgs')
      for (const s of shown) {
        const img = el('img')
        img.loading = 'lazy'
        img.alt = s.title
        img.src = `${CFG.server}/diseases/${s.id}.webp`
        img.onerror = () => { img.src = `${CFG.server}/diseases/${s.id}.svg`; img.onerror = null }
        imgs.appendChild(img)
      }
      card.appendChild(imgs)
    }
    const obs = OBSERVE_MORE[m.id] || []
    if (obs.length) {
      card.appendChild(el('ul', 'obs', obs.map((o) => `<li>${esc(o)}</li>`).join('')))
    }
    body.appendChild(card)
  }

  if (sym.others?.length) {
    const lines = sym.others.map((o) => {
      const d = findDisease(o.id)
      return `<li><b>${esc(d?.name || o.id)}</b> — ${esc(NO_IMAGE_NOTE[o.id] || d?.summary || '')}</li>`
    }).join('')
    body.appendChild(el('div', 'others',
      `<b>${sym.named ? 'โรคนี้ยังไม่มีภาพอาการในระบบ' : 'โรคอื่นที่อาการใกล้เคียง'}</b><ul>${lines}</ul>`))
  }
}

function start() {
  const ui = build()
  const mountSel = CFG.mount
  const target = mountSel ? document.querySelector(mountSel) : null
  if (target) {
    ui.wrap.classList.add('inline')
    ui.panel.classList.add('on')
    target.appendChild(ui.host)
  } else {
    document.body.appendChild(ui.host)
    if (CFG.open) ui.panel.classList.add('on')
  }

  const showHint = () => {
    ui.body.innerHTML = ''
    ui.body.appendChild(el('div', 'hint',
      '<b>ถามเรื่องหมูและฟาร์มได้เลย</b>' + EXAMPLES.map((e) => '• ' + esc(e)).join('<br>')))
  }
  showHint()

  ui.fab.onclick = () => ui.panel.classList.toggle('on')
  ui.close.onclick = () => ui.panel.classList.remove('on')

  // กดที่รูปเพื่อดูภาพใหญ่ — การ์ดอาการมีตัวหนังสืออยู่ในรูป ย่อแล้วอ่านไม่ออก
  ui.body.addEventListener('click', (e) => {
    if (e.target.tagName !== 'IMG') return
    const z = el('div', 'zoom')
    const big = el('img')
    big.src = e.target.src
    z.appendChild(big)
    z.onclick = () => z.remove()
    ui.root.querySelector('.wrap').appendChild(z)
  })

  /** อ่านออกเสียง — ลองเสียงของฟาร์มมี่ก่อน ไม่ได้ค่อยใช้เสียงของเบราว์เซอร์ */
  let audio = null
  async function speak(text) {
    try { audio?.pause() } catch { /* ไม่เป็นไร */ }
    try { window.speechSynthesis?.cancel() } catch { /* ไม่เป็นไร */ }
    const say = strip(text).slice(0, 900)
    if (!say) return
    try {
      const r = await fetch(`${CFG.server}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: say }),
      })
      const d = await r.json()
      if (d.urls?.length) {
        audio = new Audio(d.urls[0])
        await audio.play()
        return
      }
    } catch { /* ไม่ได้ก็ใช้ของเบราว์เซอร์ */ }
    try {
      const u = new SpeechSynthesisUtterance(say)
      u.lang = 'th-TH'
      window.speechSynthesis.speak(u)
    } catch { /* เครื่องนี้ไม่มีเสียงไทย ก็ปล่อยไป */ }
  }

  let busy = false
  async function ask(text) {
    const q = (text || '').trim()
    if (!q || busy) return
    busy = true
    ui.send.disabled = true
    ui.input.value = ''
    ui.body.innerHTML = ''
    ui.body.appendChild(el('p', 'q', '“' + esc(q) + '”'))
    const ansEl = el('p', 'a', 'กำลังคิด…')
    ui.body.appendChild(ansEl)

    try {
      const r = await fetch(`${CFG.server}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // qa_only = หลังบ้านจะไม่ทำคำสั่งบันทึกข้อมูลหรือส่ง LINE ให้ ถึงจะพิมพ์มาก็ตาม
        body: JSON.stringify({ text: q, qa_only: true }),
      })
      const d = await r.json()
      const answer = d.answer || d.detail || 'ขออภัยค่ะ ตอนนี้ตอบไม่ได้'
      ansEl.textContent = strip(answer)
      renderCards(ui.body, matchSymptoms(q))
      speak(answer)
    } catch {
      ansEl.textContent = 'เชื่อมต่อฟาร์มมี่ไม่ได้ค่ะ ลองใหม่อีกครั้ง'
    } finally {
      busy = false
      ui.send.disabled = false
      ui.body.scrollTop = 0
    }
  }

  ui.send.onclick = () => ask(ui.input.value)
  ui.input.onkeydown = (e) => { if (e.key === 'Enter') ask(ui.input.value) }

  // ---- พูดแทนพิมพ์ ----
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) {
    ui.mic.style.display = 'none'
  } else {
    let rec = null
    ui.mic.onclick = () => {
      if (rec) { rec.stop(); return }
      rec = new SR()
      rec.lang = 'th-TH'
      rec.interimResults = true
      rec.continuous = false
      ui.mic.classList.add('on')
      rec.onresult = (e) => {
        const t = Array.from(e.results).map((x) => x[0].transcript).join('')
        ui.input.value = t
        if (e.results[e.results.length - 1].isFinal) ask(t)
      }
      rec.onerror = () => { ui.mic.classList.remove('on'); rec = null }
      rec.onend = () => { ui.mic.classList.remove('on'); rec = null }
      rec.start()
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start)
} else {
  start()
}

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUp, Mic, Plus } from 'lucide-react'

// แท่งคลื่นเสียงในแคปซูล — ค่าคงที่ ไม่สุ่มตอน render
const BARS = [10, 20, 13, 28, 17, 24, 12, 22, 15, 26, 11, 18]

/**
 * แคปซูลรับคำสั่ง — องค์ประกอบเดียวกลางหน้า
 * ไมค์เป็นตัวเอก ช่องพิมพ์เป็นทางเลือกรอง
 *
 * @param {{
 *   onMic: () => void,
 *   onSubmit: (text: string) => void,
 *   listening: boolean,
 *   busy: boolean,
 * }} props
 */
export default function VoiceBar({ onMic, onSubmit, listening, busy }) {
  const [text, setText] = useState('')
  const ready = text.trim().length > 0 && !busy

  const submit = (e) => {
    e.preventDefault()
    if (!ready) return
    onSubmit(text.trim())
    setText('')
  }

  return (
    <form onSubmit={submit} className="w-full max-w-[820px]">
      <div
        className="flex items-center gap-3 rounded-full py-2.5 pl-5 pr-2.5 transition-shadow duration-500"
        style={{
          background: 'rgb(var(--c-raised))',
          boxShadow: listening
            ? '0 6px 34px -6px rgb(var(--c-accent) / 0.45), 0 0 0 1px rgb(var(--c-accent) / 0.35)'
            : '0 4px 22px -6px rgb(var(--c-fg) / 0.14), 0 0 0 1px rgb(var(--c-line) / 0.9)',
        }}
      >
        <Plus className="h-5 w-5 flex-shrink-0 text-muted" strokeWidth={1.7} />

        {/* ตอนกำลังฟัง สลับช่องพิมพ์เป็นคลื่นเสียง */}
        {listening ? (
          <div className="flex h-11 flex-1 items-center gap-[3px]" aria-hidden="true">
            {BARS.map((h, i) => (
              <motion.span
                key={i}
                className="w-[3px] rounded-full bg-accent"
                animate={{ height: [h * 0.4, h, h * 0.55, h * 0.85, h * 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: (i % 5) * 0.1 }}
              />
            ))}
          </div>
        ) : (
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            placeholder="ถาม Farmy Voice หรือแตะไมโครโฟนเพื่อพูด"
            aria-label="ถาม Farmy Voice"
            className="h-11 min-w-0 flex-1 bg-transparent text-[17px] font-light outline-none placeholder:text-faint disabled:opacity-50"
          />
        )}

        {/* มีข้อความ -> ปุ่มส่ง / ไม่มี -> ไมค์ */}
        {ready ? (
          <motion.button
            key="send"
            type="submit"
            aria-label="ส่งคำถาม"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white transition-opacity hover:opacity-90"
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2} />
          </motion.button>
        ) : (
          <motion.button
            key="mic"
            type="button"
            onClick={onMic}
            disabled={busy && !listening}
            aria-label={listening ? 'กำลังฟัง' : 'พูดกับ Farmy Voice'}
            whileHover={{ scale: busy ? 1 : 1.06 }}
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.25 }}
            className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-500 disabled:opacity-40"
            style={{
              background: listening ? 'rgb(var(--c-accent))' : 'rgb(var(--c-accent) / 0.1)',
            }}
          >
            {listening && (
              <span className="absolute inset-0 animate-ring-expand rounded-full border border-accent/50" />
            )}
            <Mic
              className={`h-5 w-5 ${listening ? 'text-white' : 'text-accent'}`}
              strokeWidth={1.9}
            />
          </motion.button>
        )}
      </div>
    </form>
  )
}

import { motion } from 'framer-motion'

/**
 * บทสนทนาตัวอย่าง — สะอาด ไม่มีกรอบรอบทุกชิ้น
 * ฝั่งผู้ใช้ชิดขวา ฝั่ง Farmy Voice ชิดซ้ายและเน้นกว่า
 * @param {{turns: {role: 'user' | 'farmy', text: string}[], accent?: 'accent' | 'iris'}} props
 */
export default function AIConversation({ turns, accent = 'accent' }) {
  const brandColor = accent === 'iris' ? 'text-iris' : 'text-accent'

  return (
    <div className="flex flex-col gap-7">
      {turns.map((turn, i) => {
        const isUser = turn.role === 'user'
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-90px' }}
            transition={{ duration: 0.8, delay: i * 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            className={isUser ? 'self-end text-right' : 'self-start'}
          >
            <div
              className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.28em] ${
                isUser ? 'text-faint' : brandColor
              }`}
            >
              {isUser ? 'คุณ' : 'Farmy Voice'}
            </div>
            <p
              className={
                isUser
                  ? 'max-w-md text-lg font-light leading-relaxed text-muted sm:text-xl'
                  : 'max-w-2xl text-2xl font-normal leading-snug tracking-tight sm:text-[32px]'
              }
            >
              {isUser ? `“${turn.text}”` : turn.text}
            </p>
          </motion.div>
        )
      })}
    </div>
  )
}

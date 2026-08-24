import { Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'

/**
 * สลับธีม — รางเลื่อนเรียบ ๆ บอกชัดว่าตอนนี้อยู่โหมดไหน
 * @param {{isDark: boolean, onToggle: () => void}} props
 */
export default function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
      title={isDark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
      className="relative flex h-8 w-[58px] items-center rounded-full border border-line/70 px-1 transition-colors duration-500 hover:border-accent/50"
    >
      <motion.span
        layout
        transition={{ type: 'tween', duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-fg/[0.07]"
        style={{ marginLeft: isDark ? 'calc(100% - 1.5rem)' : 0 }}
      >
        {isDark ? (
          <Moon className="h-[13px] w-[13px] text-accent" strokeWidth={1.9} />
        ) : (
          <Sun className="h-[13px] w-[13px] text-warm" strokeWidth={1.9} />
        )}
      </motion.span>
    </button>
  )
}

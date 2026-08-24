import { motion } from 'framer-motion'

/**
 * โครงหน้ารอง — หน้าเหล่านี้ทำงานแบบแดชบอร์ดได้ แต่ยังคงจังหวะและระยะแบบเดียวกับหน้าแรก
 * @param {{title: string, subtitle?: string, children: React.ReactNode}} props
 */
export default function PageShell({ title, subtitle, children }) {
  return (
    <div className="stage pb-40 pt-40">
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
        className="mb-20"
      >
        <h1 className="text-statement font-semibold">{title}</h1>
        {subtitle && (
          <p className="mt-5 max-w-xl text-lg font-light leading-relaxed text-muted">{subtitle}</p>
        )}
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.14, ease: [0.22, 0.61, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  )
}

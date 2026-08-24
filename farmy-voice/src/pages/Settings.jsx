import PageShell from '../components/PageShell.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { commandRoutes } from '../services/voiceCommandService.js'

/**
 * @param {{isDark: boolean, onToggleTheme: () => void}} props
 */
export default function Settings({ isDark, onToggleTheme }) {
  return (
    <PageShell title="ตั้งค่า" subtitle="ปรับการแสดงผล และดูคำสั่งเสียงที่ระบบรองรับ">
      <div className="max-w-3xl">
        <section className="flex items-center justify-between gap-8 border-b border-line/60 pb-10">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">โหมดการแสดงผล</h2>
            <p className="mt-2 text-[15px] font-light text-muted">
              ตอนนี้ใช้โหมด{isDark ? 'มืด' : 'สว่าง'} · ระบบจะจำค่านี้ไว้ให้ครั้งถัดไป
            </p>
          </div>
          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
        </section>

        <section className="pt-14">
          <h2 className="text-lg font-semibold tracking-tight">คำสั่งเสียงที่รองรับ</h2>
          <p className="mt-2 text-[15px] font-light text-muted">
            พูดคำกริยานำ เช่น “ไปหน้า” หรือ “เปิด” ตามด้วยคำเหล่านี้
          </p>

          <ul className="mt-10">
            {commandRoutes.map((r) => (
              <li
                key={r.path + r.label}
                className="flex flex-wrap items-center gap-4 border-b border-line/40 py-5 last:border-0"
              >
                <span className="w-40 flex-shrink-0 font-medium">{r.label}</span>
                <span className="flex flex-wrap gap-2">
                  {r.keywords.slice(0, 3).map((k) => (
                    <code key={k} className="text-[13px] font-light text-muted">
                      {k}
                    </code>
                  ))}
                </span>
                <span className="ml-auto text-[13px] text-faint">{r.path}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageShell>
  )
}

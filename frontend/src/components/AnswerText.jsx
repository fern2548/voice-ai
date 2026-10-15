import { parseAnswer, isStructured } from '../utils/answerFormat.js'

/**
 * แสดงคำตอบของ AI ที่มี Markdown ปนมา ให้อ่านง่าย
 *
 * คำตอบสั้น ๆ ยังจัดกึ่งกลางเหมือนเดิม (สวยกับหน้าแรกที่โล่ง ๆ)
 * แต่คำตอบที่มีหัวข้อหรือรายการ ต้องชิดซ้าย ไม่งั้นสายตาไล่บรรทัดไม่ถูก
 */

function Inline({ parts }) {
  return parts.map((p, i) => {
    if (p.t === 'bold') return <strong key={i}>{p.v}</strong>
    if (p.t === 'link') {
      return (
        <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" className="ans-link">
          {p.v}
        </a>
      )
    }
    return <span key={i}>{p.v}</span>
  })
}

export default function AnswerText({ text, className = '' }) {
  const say = (text || '').trim()
  if (!say) return null

  if (!isStructured(say)) {
    return <p className={`vh-a ${className}`}>{say}</p>
  }

  const blocks = parseAnswer(say)
  return (
    <div className={`vh-a ans ${className}`}>
      {blocks.map((b, i) => {
        if (b.kind === 'head') return <h3 className="ans-head" key={i}><Inline parts={b.parts} /></h3>
        if (b.kind === 'para') return <p className="ans-para" key={i}><Inline parts={b.parts} /></p>
        const List = b.kind === 'ol' ? 'ol' : 'ul'
        return (
          <List className={`ans-list ${b.kind}`} key={i}>
            {b.items.map((it, j) => <li key={j}><Inline parts={it} /></li>)}
          </List>
        )
      })}
    </div>
  )
}

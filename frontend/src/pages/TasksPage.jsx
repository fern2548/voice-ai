import { useEffect, useMemo, useRef, useState } from 'react'
import { claimTask, createTask, deleteTask, getTasks, postponeTask, recordTaskResult } from '../api.js'
import { useAdminAuth } from '../context/AdminAuth.jsx'
import AdminGate from '../components/AdminGate.jsx'

// งานที่ต้องทำวันนี้ — รวมงานจากทุกระบบไว้หน้าเดียว
// เปิดมาต้องรู้ทันที: เหลืออะไร อันไหนด่วน และกดตรงไหนเมื่อทำเสร็จ
// "บันทึกผลการทำงาน" แยกเป็น เสร็จเรียบร้อย / พบปัญหา — งานที่พบปัญหาไม่ถูกปิด ต้องส่งต่อ

const SOURCE_TONE = { vaccine: 'green', followup: 'green', vet: 'red', sensor: 'amber', manual: 'blue' }
const FORWARD = ['ช่างซ่อมบำรุง', 'สัตวแพทย์', 'หัวหน้าโรงเรือน', 'ผู้จัดการฟาร์ม']
const BARNS = ['โรงเรือน 1', 'โรงเรือน 2', 'โรงเรือน 3', 'โรงเรือน 4', 'โรงเรือน 5']
const todayStr = () => new Date().toLocaleDateString('sv-SE')

const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}
const dueText = (t) => {
  if (t.status === 'done') return `เสร็จแล้ว${t.done_by ? ` · ${t.done_by}` : ''}`
  if (t.overdue) return `เกินกำหนดตั้งแต่ ${fmtDate(t.due_date)}`
  return t.due_time ? `${t.due_time} น.` : 'วันนี้'
}

// ย่อรูปก่อนส่ง — รูปจากมือถือใหญ่เกินกว่าจะเก็บดิบ ๆ
function shrinkImage(file, max = 900, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('อ่านไฟล์รูปไม่ได้')) }
    img.src = url
  })
}

export default function TasksPage() {
  const { username, profile } = useAdminAuth()
  const [data, setData] = useState(null)
  const [tick, setTick] = useState(0)
  const [filter, setFilter] = useState('open')   // open | all | mine
  const [open, setOpen] = useState(null)         // งานที่กำลังบันทึกผล
  const [writing, setWriting] = useState(false)
  const [msg, setMsg] = useState('')
  const refresh = () => setTick((t) => t + 1)
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 4000) }

  useEffect(() => {
    let alive = true
    getTasks().then((d) => alive && setData(d)).catch(() => alive && setData({ rows: [], counts: {} }))
    return () => { alive = false }
  }, [tick])

  const all = data?.rows || []
  const c = data?.counts || {}
  const rows = useMemo(() => all.filter((t) => (
    filter === 'all' ? true
      : filter === 'mine' ? t.assignee === username
        : t.status !== 'done'
  )), [all, filter, username])
  const pct = c.total ? Math.round((c.done / c.total) * 100) : 0

  const act = async (fn, okText) => {
    try { await fn(); flash(okText); setOpen(null); refresh() }
    catch (e) { flash(e?.detail || 'ทำรายการไม่สำเร็จ') }
  }

  return (
    <div className="tk">
      <header className="tk-head">
        <span className="tk-head-icon"><i className="ti ti-checklist" aria-hidden="true" /></span>
        <div>
          <h1 className="tk-title">งานที่ต้องทำวันนี้</h1>
          <p className="tk-sub">{new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        {username && <span className="tk-me"><i className="ti ti-user" aria-hidden="true" /> {profile?.display_name || username}</span>}
      </header>

      {/* ความคืบหน้า */}
      <div className="tk-prog">
        <div className="tk-prog-top">
          <span className="tk-prog-big">{c.done ?? 0} / {c.total ?? 0}</span>
          <span className="tk-prog-label">งานเสร็จแล้ว</span>
          <AdminGate>
            <button type="button" className="ask-btn tk-new" onClick={() => setWriting((w) => !w)}>
              <i className={`ti ${writing ? 'ti-x' : 'ti-plus'}`} aria-hidden="true" /> {writing ? 'ปิด' : 'เพิ่มงาน'}
            </button>
          </AdminGate>
        </div>
        <div className="tk-bar"><i style={{ width: `${pct}%` }} /></div>
        <div className="tk-counts">
          {c.overdue > 0 && <span className="tk-c bad"><b>{c.overdue}</b> เกินกำหนด</span>}
          {c.urgent > 0 && <span className="tk-c warn"><b>{c.urgent}</b> เร่งด่วน</span>}
          <span className="tk-c"><b>{c.open ?? 0}</b> ยังไม่เสร็จ</span>
          {c.issue > 0 && <span className="tk-c warn"><b>{c.issue}</b> พบปัญหา</span>}
          <span className="tk-c ok"><b>{c.done ?? 0}</b> เสร็จสิ้น</span>
        </div>
      </div>

      <div className="chip-row tk-filters">
        {[['open', `ยังไม่เสร็จ (${c.open ?? 0})`], ['all', `ทั้งหมด (${c.total ?? 0})`], ['mine', 'ของฉัน']].map(([id, label]) => (
          <button key={id} type="button" className={`chip ${filter === id ? 'chip-on' : ''}`} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>

      {msg && <div className="tk-msg">{msg}</div>}
      {writing && <AdminGate><NewTask onDone={(t) => { setWriting(false); flash(`เพิ่มงาน "${t}" แล้ว`); refresh() }} /></AdminGate>}

      {!data ? <div className="empty-note">กำลังโหลด…</div>
        : rows.length === 0 ? <div className="empty-note">{filter === 'open' ? 'งานวันนี้เสร็จหมดแล้ว 🎉' : 'ยังไม่มีงานในหมวดนี้'}</div>
          : (
            <div className="tk-list">
              {rows.map((t) => (
                <TaskCard
                  key={t.id} task={t} me={username}
                  open={open === t.id} onOpen={() => setOpen(open === t.id ? null : t.id)}
                  onAct={act} onMsg={flash}
                />
              ))}
            </div>
          )}
    </div>
  )
}

function TaskCard({ task: t, me, open, onOpen, onAct, onMsg }) {
  const tone = SOURCE_TONE[t.source] || 'blue'
  const cls = t.status === 'done' ? 'done' : t.overdue ? 'overdue' : t.status === 'issue' ? 'issue' : ''

  return (
    <article className={`tk-card ${tone} ${cls}`}>
      <div className="tk-card-top">
        <span className="tk-src">{t.source_label}</span>
        {t.priority === 'urgent' && t.status !== 'done' && <span className="tk-urgent">เร่งด่วน</span>}
        <span className={`tk-due ${t.overdue ? 'bad' : ''}`}>{dueText(t)}</span>
      </div>

      <h2 className="tk-card-title">{t.title}</h2>
      {t.detail && <p className="tk-detail">{t.detail}</p>}
      <div className="tk-tags">
        {[t.barn_no, t.pen_no].filter(Boolean).map((x) => <span className="tk-tag" key={x}>{x}</span>)}
        <span className="tk-tag who"><i className="ti ti-user" aria-hidden="true" /> {t.assignee_name || t.assignee || 'ยังไม่มีผู้รับผิดชอบ'}</span>
      </div>

      {t.status === 'issue' && (
        <div className="tk-issue">
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <div>
            <b>พบปัญหา — ยังไม่ปิดงาน</b>
            <span>{t.result_note}{t.forward_to ? ` · ส่งต่อให้ ${t.forward_to}` : ''}</span>
          </div>
        </div>
      )}
      {t.status === 'done' && t.result_note && <div className="tk-result"><i className="ti ti-circle-check" aria-hidden="true" /> {t.result_note}</div>}
      {t.result_image && <img className="tk-photo" src={t.result_image} alt="รูปผลการทำงาน" loading="lazy" />}

      <AdminGate>
        {t.status !== 'done' && (
          <div className="tk-actions">
            <button type="button" className="ask-btn tk-record" onClick={onOpen}>
              <i className="ti ti-clipboard-check" aria-hidden="true" /> บันทึกผลการทำงาน
            </button>
            {t.assignee !== me && t.status !== 'issue' && (
              <button type="button" className="btn-clear" onClick={() => onAct(() => claimTask(t.id), 'รับงานแล้ว')}>
                <i className="ti ti-hand-click" aria-hidden="true" /> รับงานนี้
              </button>
            )}
            <button type="button" className="btn-clear" onClick={() => {
              const d = window.prompt('เลื่อนไปวันที่ไหน? (ปปปป-ดด-วว)', todayStr())
              if (!d) return
              const reason = window.prompt('เหตุผล (ไม่บังคับ)') || ''
              onAct(() => postponeTask(t.id, d, reason), `เลื่อนงานเป็น ${d} แล้ว`)
            }}>
              <i className="ti ti-calendar-plus" aria-hidden="true" /> เลื่อนนัด
            </button>
            {t.source === 'manual' && (
              <button type="button" className="pager-btn tk-del" title="ลบงาน"
                onClick={() => window.confirm(`ลบงาน "${t.title}"?`) && onAct(() => deleteTask(t.id), 'ลบงานแล้ว')}>
                <i className="ti ti-trash" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        {open && <ResultForm task={t} onAct={onAct} onMsg={onMsg} />}
      </AdminGate>
    </article>
  )
}

// ---------- บันทึกผล: เสร็จเรียบร้อย / พบปัญหา ----------
function ResultForm({ task, onAct, onMsg }) {
  const [outcome, setOutcome] = useState('done')
  const [note, setNote] = useState('')
  const [image, setImage] = useState(null)
  const [forwardTo, setForwardTo] = useState('')
  const fileRef = useRef(null)

  const pick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try { setImage(await shrinkImage(file)) } catch (x) { onMsg(x.message) }
  }

  return (
    <div className={`tk-form ${outcome}`}>
      <div className="tk-form-label">ผลการทำงาน</div>
      <div className="tk-outcomes">
        <button type="button" className={`tk-outcome ${outcome === 'done' ? 'on' : ''}`} onClick={() => setOutcome('done')}>
          <i className="ti ti-circle-check" aria-hidden="true" />
          <b>เสร็จเรียบร้อย</b><small>ปิดงานนี้</small>
        </button>
        <button type="button" className={`tk-outcome bad ${outcome === 'issue' ? 'on' : ''}`} onClick={() => setOutcome('issue')}>
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <b>พบปัญหา</b><small>ส่งต่อ ยังไม่ปิดงาน</small>
        </button>
      </div>

      {outcome === 'issue' && (
        <div className="chip-row tk-forward">
          <span className="tk-form-label">ส่งต่อให้</span>
          {FORWARD.map((f) => (
            <button type="button" key={f} className={`chip ${forwardTo === f ? 'chip-on' : ''}`} onClick={() => setForwardTo(f)}>{f}</button>
          ))}
        </div>
      )}

      <div className="tk-note-row">
        <input
          className="chat-input" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder={outcome === 'issue' ? 'พบอะไร เช่น พัดลมหมายเลข 3 ไม่ทำงาน' : 'สรุปผล (ไม่บังคับ)'}
        />
        <input ref={fileRef} type="file" accept="image/*" onChange={pick} hidden />
        <button type="button" className="tk-icon-btn" onClick={() => fileRef.current?.click()} aria-label="แนบรูป">
          <i className="ti ti-camera" aria-hidden="true" />
        </button>
      </div>
      {image && <div className="tk-prev"><img src={image} alt="รูปที่จะบันทึก" /><button type="button" className="pager-btn" onClick={() => setImage(null)}><i className="ti ti-trash" aria-hidden="true" /></button></div>}

      <button
        type="button" className="ask-btn tk-confirm"
        disabled={outcome === 'issue' && !note.trim()}
        onClick={() => onAct(
          () => recordTaskResult(task.id, { outcome, note, image, forward_to: forwardTo }),
          outcome === 'done' ? 'บันทึกว่าเสร็จแล้ว ✓' : 'บันทึกปัญหาและส่งต่อแล้ว',
        )}
      >
        <i className="ti ti-check" aria-hidden="true" /> ยืนยันบันทึก
      </button>
    </div>
  )
}

// ---------- เพิ่มงานเอง ----------
function NewTask({ onDone }) {
  const EMPTY = { title: '', detail: '', barn_no: '', pen_no: '', due_date: todayStr(), due_time: '', priority: 'normal' }
  const [f, setF] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!f.title.trim() || busy) return
    setBusy(true); setErr('')
    try {
      await createTask({
        ...f, title: f.title.trim(), detail: f.detail.trim() || null,
        barn_no: f.barn_no || null, pen_no: f.pen_no.trim() || null, due_time: f.due_time || null,
      })
      setF(EMPTY); onDone(f.title.trim())
    } catch (x) { setErr(x?.detail || 'เพิ่มงานไม่สำเร็จ') } finally { setBusy(false) }
  }

  return (
    <form className="panel tk-newform" onSubmit={submit}>
      <input className="chat-input tk-newtitle" value={f.title} onChange={set('title')} placeholder="งานอะไร เช่น ล้างคอก 3" required />
      <div className="tk-newgrid">
        <label><span>โรงเรือน</span><select className="chat-input" value={f.barn_no} onChange={set('barn_no')}><option value="">—</option>{BARNS.map((b) => <option key={b}>{b}</option>)}</select></label>
        <label><span>คอก</span><input className="chat-input" value={f.pen_no} onChange={set('pen_no')} placeholder="เช่น คอก 3" /></label>
        <label><span>วันที่</span><input type="date" className="chat-input" value={f.due_date} onChange={set('due_date')} /></label>
        <label><span>เวลา</span><input type="time" className="chat-input" value={f.due_time} onChange={set('due_time')} /></label>
      </div>
      <div className="chip-row">
        <button type="button" className={`chip ${f.priority === 'normal' ? 'chip-on' : ''}`} onClick={() => setF((x) => ({ ...x, priority: 'normal' }))}>ปกติ</button>
        <button type="button" className={`chip ${f.priority === 'urgent' ? 'chip-on' : ''}`} onClick={() => setF((x) => ({ ...x, priority: 'urgent' }))}>เร่งด่วน</button>
      </div>
      <button className="ask-btn tk-confirm" type="submit" disabled={!f.title.trim() || busy}>
        <i className="ti ti-plus" aria-hidden="true" /> {busy ? 'กำลังเพิ่ม…' : 'เพิ่มงาน'}
      </button>
      {err && <div className="pig-form-msg">{err}</div>}
    </form>
  )
}

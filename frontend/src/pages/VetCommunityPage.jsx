import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addVetComment, claimVetPost, closeVetPost, createVetPost, deleteVetPost, getVetPosts, reopenVetPost,
} from '../api.js'
import { useAdminAuth } from '../context/AdminAuth.jsx'
import AdminGate from '../components/AdminGate.jsx'

// ชุมชนปรึกษาสัตวแพทย์ — ฟาร์มโพสต์เคส หมอเข้ามาตอบ กดรับดูแล แล้วปิดเคสเมื่อจบ
// 3 สถานะเท่านั้น: รอคำตอบ → มีหมอดูแลแล้ว → เสร็จสิ้น (ไม่ต้องเดาว่าเคสไหนค้าง)

const TABS = [
  { id: 'waiting', label: 'รอคำตอบ', icon: 'ti-clock', tone: 'wait' },
  { id: 'claimed', label: 'มีหมอดูแลแล้ว', icon: 'ti-user-check', tone: 'claim' },
  { id: 'done', label: 'เสร็จสิ้น', icon: 'ti-circle-check', tone: 'done' },
]
const AGE_STAGES = ['ลูกสุกรดูดนม', 'ลูกสุกรอนุบาล', 'สุกรรุ่น', 'สุกรขุน', 'แม่พันธุ์', 'พ่อพันธุ์']
const HOWTO = [
  { icon: 'ti-pencil', title: 'สร้างโพสต์', desc: 'เล่าปัญหา พร้อมรูปภาพ' },
  { icon: 'ti-message-circle', title: 'หมอคอมเมนต์', desc: 'สัตวแพทย์หลายท่านร่วมแนะนำ' },
  { icon: 'ti-user-check', title: 'รับดูแลเคส', desc: 'หมอที่พร้อมดูแลจะกดรับเคส' },
  { icon: 'ti-circle-check', title: 'ปิดเคส', desc: 'เมื่ออาการดีขึ้น หรือจบการรักษา' },
]

const ago = (iso) => {
  if (!iso) return ''
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'เมื่อสักครู่'
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`
  if (s < 86400) return `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} วันที่แล้ว`
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

// ย่อรูปก่อนส่ง — รูปจากมือถือ 4-5 MB ส่งตรง ๆ ไม่ไหว ย่อเหลือด้านยาว 1000px คุณภาพพอดูอาการ
function shrinkImage(file, max = 1000, quality = 0.72) {
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

export default function VetCommunityPage() {
  const { username, isVet, role, profile } = useAdminAuth()
  const [tab, setTab] = useState('waiting')
  const [data, setData] = useState(null)
  const [tick, setTick] = useState(0)
  const [writing, setWriting] = useState(false)
  const [msg, setMsg] = useState('')
  const refresh = () => setTick((t) => t + 1)
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 4000) }

  useEffect(() => {
    let alive = true
    getVetPosts({ status: tab }).then((d) => alive && setData(d)).catch(() => alive && setData({ rows: [], counts: {} }))
    return () => { alive = false }
  }, [tab, tick])

  const counts = data?.counts || {}
  const rows = data?.rows || []

  return (
    <div className="vc">
      <header className="vc-head">
        <span className="vc-head-icon"><i className="ti ti-stethoscope" aria-hidden="true" /></span>
        <div>
          <h1 className="vc-title">โพสต์ปรึกษาสัตวแพทย์</h1>
          <p className="vc-sub">ชุมชนสัตวแพทย์ ร่วมตอบคำถาม ดูแลสุขภาพสัตว์เลี้ยงในฟาร์ม</p>
        </div>
        <img src="/guide/piglet.webp" alt="" className="vc-pig" />
      </header>

      <div className="vc-bar">
        <div className="vc-tabs">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={`vc-tab ${tab === t.id ? 'on' : ''} ${t.tone}`} onClick={() => setTab(t.id)}>
              <i className={`ti ${t.icon}`} aria-hidden="true" />
              {t.label} ({counts[t.id] ?? 0})
            </button>
          ))}
        </div>
        <AdminGate>
          <button type="button" className="ask-btn vc-new" onClick={() => setWriting((w) => !w)}>
            <i className={`ti ${writing ? 'ti-x' : 'ti-plus'}`} aria-hidden="true" /> {writing ? 'ปิดฟอร์ม' : 'สร้างโพสต์ใหม่'}
          </button>
        </AdminGate>
      </div>

      {msg && <div className="vc-msg">{msg}</div>}

      {/* บอกว่าตอนนี้เราเข้ามาในฐานะอะไร และยืนยันหรือยัง */}
      {username && (
        <div className="vc-me">
          <span className={`vc-avatar ${isVet ? 'vet' : ''}`}><i className={`ti ${isVet ? 'ti-stethoscope' : 'ti-user'}`} aria-hidden="true" /></span>
          <div>
            <b>{profile?.display_name || username}</b>
            <small>
              {profile?.job_label || 'ผู้ใช้งาน'}{profile?.org_name ? ` · ${profile.org_name}` : ''}
            </small>
          </div>
          {isVet && <span className="vc-badge"><i className="ti ti-rosette-discount-check" aria-hidden="true" /> สัตวแพทย์ยืนยันแล้ว</span>}
          {!isVet && profile?.vet_status === 'pending' && <span className="vc-badge pending"><i className="ti ti-clock" aria-hidden="true" /> รอผู้ดูแลยืนยันสถานะสัตวแพทย์</span>}
        </div>
      )}

      <div className="vc-grid">
        <div className="vc-feed">
          {writing && <AdminGate><NewPost onDone={(t) => { setWriting(false); setTab('waiting'); flash(`โพสต์ "${t}" แล้ว — หมอจะเข้ามาตอบเร็ว ๆ นี้`); refresh() }} /></AdminGate>}

          {!data ? <div className="empty-note">กำลังโหลด…</div>
            : rows.length === 0 ? <div className="empty-note">ยังไม่มีเคสในหมวดนี้</div>
              : rows.map((p) => (
                <PostCard key={p.id} post={p} me={username} isVet={isVet} vetStatus={profile?.vet_status} isAdmin={role === 'admin'} onChanged={refresh} onMsg={flash} />
              ))}
        </div>

        <aside className="vc-side">
          <div className="panel vc-sec">
            <div className="vc-sec-head"><i className="ti ti-chart-pie" aria-hidden="true" /> ภาพรวมเคสในชุมชน</div>
            <div className="vc-counts">
              {TABS.map((t) => (
                <button key={t.id} type="button" className={`vc-count ${t.tone} ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
                  <i className={`ti ${t.icon}`} aria-hidden="true" />
                  <b>{counts[t.id] ?? 0}</b>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel vc-sec">
            <div className="vc-sec-head"><i className="ti ti-list-numbers" aria-hidden="true" /> วิธีการใช้งาน</div>
            <ol className="vc-howto">
              {HOWTO.map((h, i) => (
                <li key={h.title}>
                  <span className="vc-step">{i + 1}</span>
                  <i className={`ti ${h.icon}`} aria-hidden="true" />
                  <div><b>{h.title}</b><small>{h.desc}</small></div>
                </li>
              ))}
            </ol>
          </div>

          <div className="vc-quote">
            <i className="ti ti-quote" aria-hidden="true" />
            หลายความเห็น หลายมุมมอง เพื่อสุขภาพสัตว์ที่ดีกว่า
            <span>— Farmy Voice</span>
          </div>
        </aside>
      </div>
    </div>
  )
}

// ---------- โพสต์ใหม่ ----------
function NewPost({ onDone }) {
  const EMPTY = { title: '', detail: '', farm_name: '', barn_no: '', pen_no: '', pig_count: '', age_stage: '' }
  const [f, setF] = useState(EMPTY)
  const [image, setImage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef(null)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const pick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try { setImage(await shrinkImage(file)) } catch (x) { setErr(x.message) }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!f.title.trim() || busy) return
    setBusy(true); setErr('')
    try {
      await createVetPost({
        ...f, title: f.title.trim(), detail: f.detail.trim() || null, image,
        pig_count: f.pig_count === '' ? null : Number(f.pig_count),
        farm_name: f.farm_name.trim() || null, barn_no: f.barn_no.trim() || null, pen_no: f.pen_no.trim() || null,
        age_stage: f.age_stage || null,
      })
      setF(EMPTY); setImage(null); onDone(f.title.trim())
    } catch (x) { setErr(x?.detail || 'โพสต์ไม่สำเร็จ') } finally { setBusy(false) }
  }

  return (
    <form className="panel vc-post vc-new-form" onSubmit={submit}>
      <div className="vc-sec-head"><i className="ti ti-pencil" aria-hidden="true" /> เล่าอาการที่เจอ</div>
      <input className="chat-input vc-title-in" value={f.title} onChange={set('title')} placeholder="หัวข้อ เช่น หมูซึม ไม่กินอาหาร มีไข้" required />
      <textarea className="chat-input vc-detail-in" rows={3} value={f.detail} onChange={set('detail')} placeholder="อาการที่เห็น เป็นมากี่วัน กินอาหารเป็นยังไง อุณหภูมิเท่าไหร่…" />

      <div className="vc-fields">
        <label><span>ฟาร์ม</span><input className="chat-input" value={f.farm_name} onChange={set('farm_name')} placeholder="ชื่อฟาร์ม" /></label>
        <label><span>โรงเรือน</span><input className="chat-input" value={f.barn_no} onChange={set('barn_no')} placeholder="เช่น โรงเรือน 2" /></label>
        <label><span>คอก</span><input className="chat-input" value={f.pen_no} onChange={set('pen_no')} placeholder="เช่น คอก 4" /></label>
        <label><span>จำนวนที่มีอาการ</span><input type="number" min="1" className="chat-input" value={f.pig_count} onChange={set('pig_count')} placeholder="ตัว" /></label>
        <label><span>ระยะสุกร</span>
          <select className="chat-input" value={f.age_stage} onChange={set('age_stage')}>
            <option value="">—</option>
            {AGE_STAGES.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
      </div>

      <div className="vc-photo">
        <input ref={fileRef} type="file" accept="image/*" onChange={pick} hidden />
        <button type="button" className="btn-clear" onClick={() => fileRef.current?.click()}>
          <i className="ti ti-camera" aria-hidden="true" /> {image ? 'เปลี่ยนรูป' : 'แนบรูป (ช่วยให้หมอดูอาการได้ชัด)'}
        </button>
        {image && <div className="vc-photo-prev"><img src={image} alt="รูปที่จะโพสต์" /><button type="button" className="pager-btn" onClick={() => setImage(null)}><i className="ti ti-trash" aria-hidden="true" /></button></div>}
      </div>

      <button className="ask-btn vc-submit" type="submit" disabled={!f.title.trim() || busy}>
        <i className="ti ti-send" aria-hidden="true" /> {busy ? 'กำลังโพสต์…' : 'โพสต์ถามหมอ'}
      </button>
      {err && <div className="pig-form-msg">{err}</div>}
    </form>
  )
}

// ---------- การ์ดเคส ----------
function PostCard({ post, me, isVet, vetStatus, isAdmin, onChanged, onMsg }) {
  const [comments, setComments] = useState(post.comments || [])
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const st = TABS.find((t) => t.id === post.status) || TABS[0]
  const canClose = post.status !== 'done' && (me === post.author || me === post.claimed_by || isAdmin)
  const shown = useMemo(() => (open ? comments : comments.slice(-2)), [open, comments])

  const send = async (e) => {
    e.preventDefault()
    if (!body.trim() || busy) return
    setBusy(true)
    try {
      const c = await addVetComment(post.id, body.trim())
      setComments((list) => [...list, c]); setBody(''); setOpen(true)
    } catch (x) { onMsg(x?.detail || 'ส่งความคิดเห็นไม่สำเร็จ') } finally { setBusy(false) }
  }
  const act = async (fn, okText) => {
    try { await fn(post.id); onMsg(okText); onChanged() } catch (x) { onMsg(x?.detail || 'ทำรายการไม่สำเร็จ') }
  }

  return (
    <article className={`panel vc-post st-${post.status}`}>
      <header className="vc-post-head">
        <span className="vc-avatar"><i className="ti ti-user" aria-hidden="true" /></span>
        <div className="vc-who">
          <b>{post.author_name || post.author}</b>
          <small>{post.farm_name ? `${post.farm_name} · ` : ''}{ago(post.created_at)}</small>
        </div>
        <span className={`vc-status ${st.tone}`}><i className={`ti ${st.icon}`} aria-hidden="true" /> {st.label}</span>
      </header>

      <div className="vc-post-body">
        {post.image && <img className="vc-photo-main" src={post.image} alt={post.title} loading="lazy" />}
        <div className="vc-post-text">
          <h2 className="vc-post-title">{post.title}</h2>
          {post.detail && <p>{post.detail}</p>}
          <div className="vc-tags">
            {[post.barn_no, post.pen_no, post.age_stage, post.pig_count ? `${post.pig_count} ตัว` : null]
              .filter(Boolean).map((t) => <span className="vc-tag" key={t}>{t}</span>)}
          </div>
          <div className="vc-meta">
            <span><i className="ti ti-message-circle" aria-hidden="true" /> {comments.length} ความคิดเห็น</span>
            <span><i className="ti ti-eye" aria-hidden="true" /> {post.views ?? 0} คนดู</span>
            {post.claimed_by && <span><i className="ti ti-user-check" aria-hidden="true" /> ดูแลโดย {post.claimed_name || post.claimed_by}</span>}
          </div>
        </div>
      </div>

      <div className="vc-comments">
        {comments.length > 2 && !open && (
          <button type="button" className="vc-more" onClick={() => setOpen(true)}>ดูความคิดเห็นทั้งหมด ({comments.length})</button>
        )}
        {shown.map((c) => (
          <div className={`vc-comment ${c.is_vet ? 'vet' : ''}`} key={c.id}>
            <span className="vc-avatar sm"><i className={`ti ${c.is_vet ? 'ti-stethoscope' : 'ti-user'}`} aria-hidden="true" /></span>
            <div>
              <div className="vc-comment-top">
                <b>{c.author_name || c.author}</b>
                {c.is_vet && <span className="vc-badge sm"><i className="ti ti-rosette-discount-check" aria-hidden="true" /> สัตวแพทย์</span>}
                <small>{ago(c.created_at)}</small>
              </div>
              <p>{c.body}</p>
            </div>
          </div>
        ))}
        <AdminGate>
          <form className="vc-reply" onSubmit={send}>
            <input className="chat-input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="แสดงความคิดเห็น / คำแนะนำ…" />
            <button className="ask-btn vc-send" type="submit" disabled={!body.trim() || busy} aria-label="ส่งความคิดเห็น"><i className="ti ti-send" aria-hidden="true" /></button>
          </form>
        </AdminGate>
      </div>

      <AdminGate>
        <footer className="vc-actions">
          {post.status === 'waiting' && !isVet && vetStatus === 'pending' && (
            <span className="vc-hint"><i className="ti ti-clock" aria-hidden="true" /> รอยืนยันสถานะสัตวแพทย์จึงจะรับเคสได้</span>
          )}
          {post.status === 'waiting' && isVet && (
            <button type="button" className="ask-btn" onClick={() => act(claimVetPost, 'รับดูแลเคสแล้ว')}><i className="ti ti-user-check" aria-hidden="true" /> รับดูแลเคส</button>
          )}
          {canClose && (
            <button type="button" className="btn-clear vc-close" onClick={() => act((id) => closeVetPost(id), 'ปิดเคสแล้ว')}><i className="ti ti-circle-check" aria-hidden="true" /> ปิดเคส</button>
          )}
          {post.status === 'done' && (me === post.author || me === post.claimed_by || isAdmin) && (
            <button type="button" className="btn-clear" onClick={() => act(reopenVetPost, 'เปิดเคสใหม่แล้ว')}><i className="ti ti-rotate" aria-hidden="true" /> เปิดเคสใหม่</button>
          )}
          {(me === post.author || isAdmin) && (
            <button type="button" className="pager-btn vc-del" title="ลบโพสต์"
              onClick={() => window.confirm(`ลบโพสต์ "${post.title}"?`) && act(deleteVetPost, 'ลบโพสต์แล้ว')}>
              <i className="ti ti-trash" aria-hidden="true" />
            </button>
          )}
        </footer>
      </AdminGate>
    </article>
  )
}

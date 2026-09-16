import { useEffect, useRef, useState } from 'react'
import { addKnowledgeText, deleteKnowledge, getKnowledge, searchKnowledge, uploadKnowledge } from '../api.js'

// หน้า "คลังความรู้" — ใส่เอกสารของฟาร์ม (คู่มือวัคซีน โรคหมู SOP) ให้ AI ค้นมาใช้ตอบ
// ใส่ได้ 2 ทาง: วางข้อความ หรืออัปโหลดไฟล์ · มีช่องทดลองค้นให้เช็คว่า AI จะเจอท่อนไหน

const fmtDate = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

// ข้อความผิดพลาดจากเซิร์ฟเวอร์ (detail) อ่านรู้เรื่องกว่า "500" เฉย ๆ
const errMsg = (e, fallback) => e?.detail || (e?.status ? `${fallback} (${e.status})` : 'ต่อเซิร์ฟเวอร์ไม่ได้')

export default function KnowledgePage() {
  const [data, setData] = useState(null)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [q, setQ] = useState('')
  const [hits, setHits] = useState(null)
  const [searching, setSearching] = useState(false)
  const fileRef = useRef(null)

  const reload = () => getKnowledge().then(setData).catch(() => setData({ enabled: false, docs: [] }))
  useEffect(() => { reload() }, [])

  const submitText = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true); setMsg('')
    try {
      const r = await addKnowledgeText(title, text)
      setMsg(`เพิ่ม "${r.title}" แล้ว (${r.chunks} ท่อน)`)
      setTitle(''); setText('')
      reload()
    } catch (err) {
      setMsg(errMsg(err, 'เพิ่มไม่สำเร็จ'))
    } finally {
      setBusy(false)
    }
  }

  const submitFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setMsg(`กำลังอ่าน ${file.name}…`)
    try {
      const r = await uploadKnowledge(file, title)
      setMsg(`เพิ่ม "${r.title}" แล้ว (${r.chunks} ท่อน)`)
      setTitle('')
      reload()
    } catch (err) {
      setMsg(errMsg(err, 'อัปโหลดไม่สำเร็จ'))
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const remove = async (doc) => {
    if (!window.confirm(`ลบเอกสาร "${doc.title}" ?`)) return
    try {
      await deleteKnowledge(doc.id)
      reload()
    } catch (err) {
      setMsg(errMsg(err, 'ลบไม่สำเร็จ'))
    }
  }

  const doSearch = async (e) => {
    e.preventDefault()
    if (!q.trim()) return
    setSearching(true)
    try {
      setHits((await searchKnowledge(q)).hits)
    } catch (err) {
      setHits([]); setMsg(errMsg(err, 'ค้นไม่สำเร็จ'))
    } finally {
      setSearching(false)
    }
  }

  const docs = data?.docs || []

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">คลังความรู้ · KNOWLEDGE</span>
          <span className="panel-tag">{docs.length} เอกสาร</span>
        </div>
        <p className="kb-intro">
          ใส่คู่มือวัคซีน อาการโรคหมู ขั้นตอนงานในฟาร์ม หรือบันทึกสำคัญ — เวลาถาม AI จะค้นเอกสารพวกนี้มาใช้ตอบก่อนความรู้ทั่วไป
        </p>
        {data && !data.enabled && (
          <div className="kb-warn">
            <i className="ti ti-alert-triangle" aria-hidden="true" /> ยังไม่ได้ตั้งค่า GEMINI_API_KEY ที่เซิร์ฟเวอร์ — เพิ่มเอกสารได้หลังตั้งค่าแล้ว
          </div>
        )}

        <form className="pig-form" onSubmit={submitText}>
          <div className="pig-form-row">
            <label className="pig-form-field kb-grow">
              <span>ชื่อเอกสาร</span>
              <input
                className="chat-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น คู่มือวัคซีน PRRS"
                maxLength={200}
              />
            </label>
          </div>
          <label className="pig-form-field">
            <span>วางข้อความ</span>
            <textarea
              className="chat-input kb-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="วางเนื้อหาเอกสารที่นี่ (เว้นบรรทัดว่างระหว่างหัวข้อ จะช่วยให้ค้นแม่นขึ้น)"
              rows={7}
            />
          </label>
          <div className="pig-form-actions kb-actions">
            <button className="ask-btn" type="submit" disabled={busy || !text.trim()}>
              <i className="ti ti-plus" aria-hidden="true" /> เพิ่มจากข้อความ
            </button>
            <label className={`btn-clear kb-upload ${busy ? 'off' : ''}`}>
              <i className="ti ti-upload" aria-hidden="true" /> อัปโหลดไฟล์ (.txt .md .pdf .docx)
              <input ref={fileRef} type="file" accept=".txt,.md,.pdf,.docx" onChange={submitFile} disabled={busy} hidden />
            </label>
            {msg && <span className="pig-form-msg">{msg}</span>}
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-head"><span className="panel-title">เอกสารที่มี</span></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>ชื่อ</th><th>ที่มา</th><th>ขนาด</th><th>เพิ่มเมื่อ</th><th /></tr>
            </thead>
            <tbody>
              {!data ? (
                <tr><td colSpan="5" className="td-empty">กำลังโหลด…</td></tr>
              ) : docs.length === 0 ? (
                <tr><td colSpan="5" className="td-empty">ยังไม่มีเอกสาร — เพิ่มจากด้านบนได้เลย</td></tr>
              ) : docs.map((d) => (
                <tr key={d.id}>
                  <td>{d.title}</td>
                  <td className="kb-dim">{d.source?.startsWith('file:') ? d.source.slice(5) : 'ข้อความ'}</td>
                  <td className="kb-dim">{d.chunk_count} ท่อน · {(d.chars || 0).toLocaleString('th-TH')} ตัวอักษร</td>
                  <td className="kb-dim">{fmtDate(d.created_at)}</td>
                  <td>
                    <button className="pager-btn" onClick={() => remove(d)}>
                      <i className="ti ti-trash" aria-hidden="true" /> ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><span className="panel-title">ทดลองค้น</span></div>
        <p className="kb-intro">พิมพ์คำถามแบบที่จะถาม AI แล้วดูว่าระบบค้นเจอท่อนไหน — ถ้าไม่เจอ แปลว่าเอกสารยังไม่มีเรื่องนั้น</p>
        <form className="kb-search" onSubmit={doSearch}>
          <input
            className="chat-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="เช่น หมูท้องเสียทำไง"
          />
          <button className="ask-btn" type="submit" disabled={searching || !q.trim()}>
            <i className="ti ti-search" aria-hidden="true" /> ค้น
          </button>
        </form>
        {hits && (
          hits.length === 0 ? (
            <div className="empty-note">ไม่พบท่อนที่เกี่ยวข้อง</div>
          ) : (
            <div className="kb-hits">
              {hits.map((h, i) => (
                <div className="kb-hit" key={i}>
                  <div className="kb-hit-head">
                    <span className="kb-hit-title">{h.title}</span>
                    <span className="kb-hit-score">ตรง {Math.round(h.score * 100)}%</span>
                  </div>
                  <div className="kb-hit-body">{h.content}</div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </>
  )
}

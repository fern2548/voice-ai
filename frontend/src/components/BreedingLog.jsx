import { useEffect, useMemo, useState } from 'react'
import { BREEDS } from '../data/breeding.js'

// ตารางบันทึกการผสมพันธุ์ — ทำตามแบบฟอร์มกระดาษที่ฟาร์มใช้อยู่
// ต่างกันตรงที่ช่อง "กำหนดกลับสัด" และ "วันกำหนดคลอด" ระบบคำนวณให้เอง
// ไม่ต้องนั่งนับปฏิทิน และเตือนให้เมื่อใกล้ถึงกำหนด

const LS = 'farmy.breeding.log'
const DAYS_RETURN = 21     // กลับเป็นสัดถ้าผสมไม่ติด
const DAYS_FARROW = 114    // ระยะตั้งท้อง

const RESULTS = [
  { id: 'wait', label: 'รอดูผล' },
  { id: 'pregnant', label: 'ติด' },
  { id: 'failed', label: 'ไม่ติด' },
]

const BREED_NAMES = [...BREEDS.map((b) => b.name), 'ลูกผสม', 'อื่น ๆ']

const todayStr = () => new Date().toLocaleDateString('sv-SE')
const addDays = (iso, n) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE')
}
const fmt = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
}
const daysLeft = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return Math.round((d - new Date(new Date().toDateString())) / 86400000)
}

const read = () => {
  try {
    const v = localStorage.getItem(LS)
    return v ? JSON.parse(v) : []
  } catch { return [] }
}

const EMPTY = {
  damNo: '', damBreed: '', damLine: '',
  sireNo: '', sireBreed: '', sireLine: '',
  round: '1', mateDate: todayStr(),
  result: 'wait', farrowDate: '', pigletCount: '', note: '',
}

export default function BreedingLog() {
  const [rows, setRows] = useState(read)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(rows)) } catch { /* ไม่เป็นไร */ }
  }, [rows])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const startAdd = () => { setForm({ ...EMPTY, mateDate: todayStr() }); setEditId(null); setErr(''); setOpen(true) }
  const startEdit = (r) => { setForm({ ...r }); setEditId(r.id); setErr(''); setOpen(true) }

  const save = () => {
    if (!form.damNo.trim()) { setErr('ใส่เบอร์แม่สุกรก่อน'); return }
    if (!form.mateDate) { setErr('ใส่วันที่ผสมก่อน'); return }
    if (editId) {
      setRows((rs) => rs.map((r) => (r.id === editId ? { ...form, id: editId } : r)))
    } else {
      setRows((rs) => [...rs, { ...form, id: Date.now().toString(36) }])
    }
    setOpen(false); setEditId(null); setErr('')
  }

  const remove = (id) => {
    if (!window.confirm('ลบรายการนี้ออกจากตาราง?')) return
    setRows((rs) => rs.filter((r) => r.id !== id))
  }

  // เรียงตามวันผสม ใหม่อยู่บน
  const sorted = useMemo(
    () => [...rows].sort((a, b) => (b.mateDate || '').localeCompare(a.mateDate || '')),
    [rows],
  )

  // แม่ที่ใกล้ถึงกำหนด — ไว้เตือนด้านบน
  const soon = useMemo(() => {
    const out = []
    rows.forEach((r) => {
      if (r.farrowDate) return                       // คลอดแล้ว ไม่ต้องเตือน
      if (r.result === 'failed') return
      const back = daysLeft(addDays(r.mateDate, DAYS_RETURN))
      const due = daysLeft(addDays(r.mateDate, DAYS_FARROW))
      if (r.result === 'wait' && back != null && back >= 0 && back <= 3) {
        out.push({ id: r.id, damNo: r.damNo, what: 'เช็กว่ากลับสัดไหม', left: back })
      }
      if (r.result === 'pregnant' && due != null && due >= 0 && due <= 7) {
        out.push({ id: r.id, damNo: r.damNo, what: 'กำหนดคลอด', left: due })
      }
    })
    return out.sort((a, b) => a.left - b.left)
  }, [rows])

  const exportCsv = () => {
    const head = ['ลำดับที่', 'เบอร์แม่สุกร', 'พันธุ์แม่', 'สายพันธุ์แม่', 'เบอร์พ่อสุกร', 'พันธุ์พ่อ',
      'สายพันธุ์พ่อ', 'ผสมครั้งที่', 'วันที่ผสม', 'กำหนดกลับสัด', 'ผลการผสมพันธุ์',
      'วันกำหนดคลอด', 'วันคลอด', 'จำนวนลูกเมื่อคลอด', 'หมายเหตุ']
    const esc = (v) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [head.join(',')]
    sorted.forEach((r, i) => {
      lines.push([
        i + 1, r.damNo, r.damBreed, r.damLine, r.sireNo, r.sireBreed, r.sireLine, r.round,
        r.mateDate, addDays(r.mateDate, DAYS_RETURN),
        RESULTS.find((x) => x.id === r.result)?.label || '',
        addDays(r.mateDate, DAYS_FARROW), r.farrowDate, r.pigletCount, r.note,
      ].map(esc).join(','))
    })
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `บันทึกการผสมพันธุ์-${todayStr()}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="bl">
      <div className="bl-top">
        <div className="bl-top-text">
          <b>บันทึกการผสมพันธุ์</b>
          <small>
            {rows.length ? `มี ${rows.length} รายการ` : 'ยังไม่มีรายการ'} ·
            ช่องกำหนดกลับสัดและกำหนดคลอด ระบบคำนวณให้เอง
          </small>
        </div>
        <div className="bl-top-btns">
          {rows.length > 0 && (
            <>
              <button type="button" className="bl-btn ghost" onClick={exportCsv}>
                <i className="ti ti-file-spreadsheet" aria-hidden="true" /> บันทึกเป็น Excel
              </button>
              <button type="button" className="bl-btn ghost" onClick={() => window.print()}>
                <i className="ti ti-printer" aria-hidden="true" /> พิมพ์ตาราง
              </button>
            </>
          )}
          <button type="button" className="bl-btn main" onClick={startAdd}>
            <i className="ti ti-plus" aria-hidden="true" /> เพิ่มรายการ
          </button>
        </div>
      </div>

      {soon.length > 0 && (
        <div className="bl-soon">
          <i className="ti ti-bell" aria-hidden="true" />
          <div>
            <b>ใกล้ถึงกำหนด</b>
            <ul>
              {soon.map((s) => (
                <li key={s.id + s.what}>
                  แม่เบอร์ <b>{s.damNo}</b> — {s.what}{' '}
                  {s.left === 0 ? 'วันนี้' : `อีก ${s.left} วัน`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {open && (
        <div className="bl-form">
          <div className="bl-form-head">
            <b>{editId ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}</b>
            <button type="button" className="bl-close" onClick={() => { setOpen(false); setEditId(null) }}
              aria-label="ปิด"><i className="ti ti-x" aria-hidden="true" /></button>
          </div>

          <div className="bl-grid">
            <label className="bl-f"><span>เบอร์แม่สุกร *</span>
              <input className="chat-input" value={form.damNo} onChange={set('damNo')} placeholder="เช่น 125" /></label>
            <label className="bl-f"><span>พันธุ์แม่</span>
              <select className="chat-input" value={form.damBreed} onChange={set('damBreed')}>
                <option value="">— เลือก —</option>
                {BREED_NAMES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select></label>
            <label className="bl-f"><span>สายพันธุ์แม่</span>
              <input className="chat-input" value={form.damLine} onChange={set('damLine')} placeholder="เช่น L-12" /></label>

            <label className="bl-f"><span>เบอร์พ่อสุกร</span>
              <input className="chat-input" value={form.sireNo} onChange={set('sireNo')} placeholder="เช่น 48" /></label>
            <label className="bl-f"><span>พันธุ์พ่อ</span>
              <select className="chat-input" value={form.sireBreed} onChange={set('sireBreed')}>
                <option value="">— เลือก —</option>
                {BREED_NAMES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select></label>
            <label className="bl-f"><span>สายพันธุ์พ่อ</span>
              <input className="chat-input" value={form.sireLine} onChange={set('sireLine')} placeholder="เช่น D-07" /></label>

            <label className="bl-f"><span>ผสมครั้งที่</span>
              <input className="chat-input" type="number" min="1" value={form.round} onChange={set('round')} /></label>
            <label className="bl-f"><span>วันที่ผสม *</span>
              <input className="chat-input" type="date" value={form.mateDate} onChange={set('mateDate')} /></label>
            <label className="bl-f"><span>ผลการผสมพันธุ์</span>
              <select className="chat-input" value={form.result} onChange={set('result')}>
                {RESULTS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select></label>

            <label className="bl-f"><span>วันคลอดจริง</span>
              <input className="chat-input" type="date" value={form.farrowDate} onChange={set('farrowDate')} /></label>
            <label className="bl-f"><span>จำนวนลูกเมื่อคลอด</span>
              <input className="chat-input" type="number" min="0" value={form.pigletCount} onChange={set('pigletCount')} /></label>
            <label className="bl-f wide"><span>หมายเหตุ</span>
              <input className="chat-input" value={form.note} onChange={set('note')} placeholder="เช่น ผสมเทียม · ลูกตาย 1 ตัว" /></label>
          </div>

          {form.mateDate && (
            <div className="bl-auto">
              <i className="ti ti-calculator" aria-hidden="true" />
              ระบบคำนวณให้: กลับสัด <b>{fmt(addDays(form.mateDate, DAYS_RETURN))}</b> ·
              กำหนดคลอด <b>{fmt(addDays(form.mateDate, DAYS_FARROW))}</b>
            </div>
          )}

          {err && <div className="bl-err"><i className="ti ti-alert-circle" aria-hidden="true" /> {err}</div>}

          <div className="bl-form-btns">
            <button type="button" className="bl-btn main" onClick={save}>
              <i className="ti ti-check" aria-hidden="true" /> {editId ? 'บันทึกการแก้ไข' : 'เพิ่มลงตาราง'}
            </button>
            <button type="button" className="bl-btn ghost" onClick={() => { setOpen(false); setEditId(null) }}>ยกเลิก</button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="bl-empty">
          <i className="ti ti-table" aria-hidden="true" />
          <b>ยังไม่มีบันทึก</b>
          <span>กด “เพิ่มรายการ” เพื่อบันทึกการผสมครั้งแรก</span>
        </div>
      ) : (
        <div className="bl-wrap bl-print">
          <table className="bl-table">
            <thead>
              <tr>
                <th>ลำดับ<br />ที่</th>
                <th>เบอร์<br />แม่สุกร</th>
                <th>พันธุ์</th>
                <th>สาย<br />พันธุ์</th>
                <th>เบอร์<br />พ่อสุกร</th>
                <th>พันธุ์</th>
                <th>สาย<br />พันธุ์</th>
                <th>ผสม<br />ครั้งที่</th>
                <th>ว.ด.ป.<br />ผสมพันธุ์</th>
                <th>กำหนด<br />กลับสัด</th>
                <th>ผลการ<br />ผสมพันธุ์</th>
                <th>วันกำหนด<br />คลอด</th>
                <th>วันคลอด</th>
                <th>จำนวนลูก<br />เมื่อคลอด</th>
                <th>หมายเหตุ</th>
                <th className="bl-noprint" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const due = addDays(r.mateDate, DAYS_FARROW)
                const left = r.farrowDate ? null : daysLeft(due)
                const near = r.result === 'pregnant' && left != null && left >= 0 && left <= 7
                return (
                  <tr key={r.id} className={near ? 'near' : ''}>
                    <td>{i + 1}</td>
                    <td className="bl-strong">{r.damNo}</td>
                    <td>{r.damBreed || '—'}</td>
                    <td>{r.damLine || '—'}</td>
                    <td>{r.sireNo || '—'}</td>
                    <td>{r.sireBreed || '—'}</td>
                    <td>{r.sireLine || '—'}</td>
                    <td>{r.round || '—'}</td>
                    <td>{fmt(r.mateDate)}</td>
                    <td className="bl-calc">{fmt(addDays(r.mateDate, DAYS_RETURN))}</td>
                    <td>
                      <span className={`bl-res ${r.result}`}>
                        {RESULTS.find((x) => x.id === r.result)?.label}
                      </span>
                    </td>
                    <td className="bl-calc">
                      {fmt(due)}
                      {near && <small className="bl-left">อีก {left} วัน</small>}
                    </td>
                    <td>{fmt(r.farrowDate)}</td>
                    <td>{r.pigletCount || '—'}</td>
                    <td className="bl-note">{r.note || '—'}</td>
                    <td className="bl-noprint">
                      <button type="button" className="bl-ico" onClick={() => startEdit(r)} aria-label="แก้ไข">
                        <i className="ti ti-pencil" aria-hidden="true" />
                      </button>
                      <button type="button" className="bl-ico danger" onClick={() => remove(r.id)} aria-label="ลบ">
                        <i className="ti ti-trash" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="bl-foot">
        <i className="ti ti-device-floppy" aria-hidden="true" />
        บันทึกเก็บไว้ในเครื่องนี้เท่านั้น เปิดจากเครื่องอื่นจะไม่เห็นข้อมูล
        แนะนำให้กด “บันทึกเป็น Excel” เก็บสำรองไว้เป็นระยะ
      </p>
    </div>
  )
}

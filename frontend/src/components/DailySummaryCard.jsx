import { useEffect, useState } from 'react'
import { getDailySummary } from '../api.js'

// สรุปว่า "วันนี้ทำอะไรไปแล้วบ้าง" — รวมทุกอย่างที่ถูกบันทึกเข้าระบบในวันนั้น
// หน้านี้แสดงสิ่งเดียวกับที่ระบบส่งเข้า LINE ตอนเย็น จะได้ตรวจก่อนได้ว่าตกอะไรไปไหม
//
// ต่างจากการ์ดความคืบหน้าด้านบนที่นับเฉพาะ "งาน"
// อันนี้รวมการฉีดวัคซีน ผสมพันธุ์ บันทึกสุขภาพ คลังยา และเคสที่ส่งปรึกษาสัตวแพทย์ด้วย

export default function DailySummaryCard() {
  const [sm, setSm] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    getDailySummary()
      .then((d) => alive && setSm(d))
      .catch(() => alive && setErr('ดึงสรุปไม่สำเร็จ'))
    return () => { alive = false }
  }, [])

  if (err) return <div className="empty-note">{err}</div>
  if (!sm) return <div className="empty-note">กำลังรวบรวมสรุปของวันนี้…</div>

  return (
    <div className="ds">
      <div className="ds-top">
        <b>สรุปฟาร์มวันนี้</b>
        <small>
          {sm.total_records
            ? `บันทึกไปแล้ว ${sm.total_records} รายการ · ระบบส่งสรุปนี้เข้า LINE ให้ทุกเย็น`
            : 'วันนี้ยังไม่มีการบันทึกอะไรเข้าระบบเลย'}
        </small>
      </div>

      {sm.sections.map((sec) => (
        <div className="ds-sec" key={sec.title}>
          <div className="ds-sec-head"><span>{sec.icon}</span><b>{sec.title}</b></div>
          {sec.lines.length > 0 && (
            <ul className="ds-lines">
              {sec.lines.map((l, i) => <li key={`${sec.title}-${i}`}>{l}</li>)}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { getVaccineSchedule } from '../api.js'

export default function VaccineSchedule() {
  const [rules, setRules] = useState([])

  useEffect(() => {
    getVaccineSchedule()
      .then((d) => setRules(Array.isArray(d?.rows) ? d.rows : []))
      .catch(() => {})
  }, [])

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">กำหนดรอบฉีดซ้ำต่อวัคซีน · เรียนรู้จากเสียงอัตโนมัติ</span>
      </div>
      <p className="schedule-hint">
        ระบบจำกำหนดให้เองจากที่พูด เช่น "บันทึกฉีดวัคซีนปากเท้าเปื่อยวันนี้ อีก 30 วันฉีดอีกที"
        — พูดครั้งแรกครั้งเดียว ครั้งต่อไปพูดชื่อวัคซีนเดิมไม่ต้องบอกจำนวนวันซ้ำ ระบบคำนวณวันนัดให้อัตโนมัติ
      </p>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ชื่อวัคซีน</th>
              <th>ฉีดซ้ำทุก (วัน)</th>
              <th>บันทึกเพิ่มเติม</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td colSpan="3" className="td-empty">
                  ยังไม่มีกำหนดที่จำไว้ — พูดบันทึกวัคซีนพร้อมบอกรอบฉีดซ้ำครั้งแรกเพื่อให้ระบบจำ
                </td>
              </tr>
            ) : (
              rules.map((r) => (
                <tr key={r.vaccine_name}>
                  <td>{r.vaccine_name}</td>
                  <td>{r.interval_days}</td>
                  <td>{r.note ?? '--'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

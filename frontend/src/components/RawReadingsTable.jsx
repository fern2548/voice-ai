import { useState } from 'react'
import usePolling from '../hooks/usePolling.js'
import { getReadingsLog } from '../api.js'

const COLUMNS = [
  { key: 'time', label: 'เวลา' },
  { key: 'temperature', label: 'อุณหภูมิ (°C)' },
  { key: 'humidity', label: 'ความชื้น (%)' },
  { key: 'windspeed', label: 'ลม (m/s)' },
  { key: 'rainfall', label: 'ฝน (mm)' },
  { key: 'light', label: 'แสง (lux)' },
]

const RANGES = [
  { hours: null, label: 'ทั้งหมด' },
  { hours: 1, label: '1 ชม.' },
  { hours: 4, label: '4 ชม.' },
  { hours: 8, label: '8 ชม.' },
  { hours: 24, label: '24 ชม.' },
]
const PAGE_SIZE = 100

function exportCsv(rows) {
  const header = COLUMNS.map((c) => c.label).join(',')
  const lines = rows.map((row) => COLUMNS.map((c) => row[c.key] ?? '').join(','))
  const csv = [header, ...lines].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sensor-readings-${new Date().toISOString().slice(0, 19)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function RawReadingsTable() {
  const [hours, setHours] = useState(null)
  const [page, setPage] = useState(0)
  const { data, updatedAt, error } = usePolling(
    () => getReadingsLog({ page, pageSize: PAGE_SIZE, hours }),
    60000,
    `${page}-${hours}`
  )
  const rows = Array.isArray(data?.rows) ? data.rows : []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const changeRange = (h) => {
    setHours(h)
    setPage(0)
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">ข้อมูลเซนเซอร์ดิบ · RAW READINGS</span>
        <div className="head-controls">
          <div className="range-bar">
            {RANGES.map((r) => (
              <button
                key={r.label}
                className={`range-btn ${hours === r.hours ? 'on' : ''}`}
                onClick={() => changeRange(r.hours)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            className="btn-export"
            onClick={() => exportCsv(rows)}
            disabled={rows.length === 0}
          >
            <i className="ti ti-download" aria-hidden="true" style={{ marginRight: 5 }} />Export CSV (หน้านี้)
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>เวลา</th>
              <th><i className="ti ti-temperature" aria-hidden="true" /> อุณหภูมิ<span className="th-unit">°C</span></th>
              <th><i className="ti ti-droplet" aria-hidden="true" /> ความชื้น<span className="th-unit">%</span></th>
              <th><i className="ti ti-wind" aria-hidden="true" /> ลม<span className="th-unit">m/s</span></th>
              <th><i className="ti ti-cloud-rain" aria-hidden="true" /> ฝน<span className="th-unit">mm</span></th>
              <th><i className="ti ti-sun" aria-hidden="true" /> แสง<span className="th-unit">lux</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="6" className="td-empty">
                  {error ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้' : 'ยังไม่มีข้อมูลในช่วงนี้'}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.time ?? '--'}</td>
                  <td>{row.temperature ?? '--'}</td>
                  <td>{row.humidity ?? '--'}</td>
                  <td>{row.windspeed ?? '--'}</td>
                  <td>{row.rainfall ?? '--'}</td>
                  <td>{row.light ?? '--'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="panel-foot pager-foot">
        <span>
          {total > 0
            ? `ทั้งหมด ${total} รายการ · หน้า ${page + 1}/${totalPages}`
            : '—'}
          {updatedAt && ' · อัปเดต ' + updatedAt.toLocaleTimeString('th-TH')}
        </span>
        <div className="pager">
          <button
            className="pager-btn"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            ‹ ก่อนหน้า
          </button>
          <button
            className="pager-btn"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            ถัดไป ›
          </button>
        </div>
      </div>
    </div>
  )
}

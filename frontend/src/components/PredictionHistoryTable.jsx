import { useState } from 'react'
import usePolling from '../hooks/usePolling.js'
import { getPredictionsLog } from '../api.js'

const COLUMNS = [
  { key: 'predicted_at', label: 'เวลาที่ทำนาย' },
  { key: 'predicted_for', label: 'ทำนายสำหรับเวลา' },
  { key: 'temperature_pred', label: 'อุณหภูมิ ทำนาย (°C)' },
  { key: 'temperature_actual', label: 'อุณหภูมิ จริง (°C)' },
  { key: 'humidity_pred', label: 'ความชื้น ทำนาย (%)' },
  { key: 'humidity_actual', label: 'ความชื้น จริง (%)' },
  { key: 'windspeed_pred', label: 'ลม ทำนาย (m/s)' },
  { key: 'windspeed_actual', label: 'ลม จริง (m/s)' },
  { key: 'rainfall_pred', label: 'ฝน ทำนาย (mm)' },
  { key: 'rainfall_actual', label: 'ฝน จริง (mm)' },
  { key: 'light_pred', label: 'แสง ทำนาย (lux)' },
  { key: 'light_actual', label: 'แสง จริง (lux)' },
]

const RANGES = [
  { hours: null, label: 'ทั้งหมด' },
  { hours: 1, label: '1 ชม.' },
  { hours: 4, label: '4 ชม.' },
  { hours: 8, label: '8 ชม.' },
  { hours: 24, label: '24 ชม.' },
]
const PAGE_SIZE = 100

function diff(pred, actual) {
  if (pred == null || actual == null) return null
  return Math.abs(pred - actual)
}

function Cell({ pred, actual, digits = 1 }) {
  const d = diff(pred, actual)
  const cls = d == null ? '' : d <= 1 ? 'd-good' : d <= 3 ? 'd-mid' : 'd-bad'
  return (
    <td>
      <span className="cmp-pred">{pred ?? '--'}</span>
      <span className="cmp-sep">/</span>
      <span className="cmp-actual">{actual ?? '--'}</span>
      <span className={`cmp-diff ${cls}`}>
        {d == null ? '' : `Δ${d.toFixed(digits)}`}
      </span>
    </td>
  )
}

function exportCsv(rows) {
  const header = COLUMNS.map((c) => c.label).join(',')
  const lines = rows.map((row) => COLUMNS.map((c) => row[c.key] ?? '').join(','))
  const csv = [header, ...lines].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `prediction-history-${new Date().toISOString().slice(0, 19)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function PredictionHistoryTable() {
  const [hours, setHours] = useState(null)
  const [page, setPage] = useState(0)
  const { data, updatedAt } = usePolling(
    () => getPredictionsLog({ page, pageSize: PAGE_SIZE, hours }),
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
        <span className="panel-title">ประวัติทำนาย vs ค่าจริง · ACCURACY LOG</span>
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
              <th>เวลาที่ทำนาย</th>
              <th>ทำนายสำหรับ</th>
              <th><i className="ti ti-temperature" aria-hidden="true" /> อุณหภูมิ<span className="th-unit">ทำนาย / จริง / Δ</span></th>
              <th><i className="ti ti-droplet" aria-hidden="true" /> ความชื้น<span className="th-unit">ทำนาย / จริง / Δ</span></th>
              <th><i className="ti ti-wind" aria-hidden="true" /> ลม<span className="th-unit">ทำนาย / จริง / Δ</span></th>
              <th><i className="ti ti-cloud-rain" aria-hidden="true" /> ฝน<span className="th-unit">ทำนาย / จริง / Δ</span></th>
              <th><i className="ti ti-sun" aria-hidden="true" /> แสง<span className="th-unit">ทำนาย / จริง / Δ</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="7" className="td-empty">ยังไม่มีข้อมูลในช่วงนี้</td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.predicted_at ?? '--'}</td>
                  <td>{row.predicted_for ?? '--'}</td>
                  <Cell pred={row.temperature_pred} actual={row.temperature_actual} />
                  <Cell pred={row.humidity_pred} actual={row.humidity_actual} />
                  <Cell pred={row.windspeed_pred} actual={row.windspeed_actual} />
                  <Cell pred={row.rainfall_pred} actual={row.rainfall_actual} />
                  <Cell pred={row.light_pred} actual={row.light_actual} digits={0} />
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

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveData } from '../context/LiveData.jsx'
import { METRICS } from '../metrics.js'
import { SENSOR_VALUE, COST_ITEMS } from '../data/sensorValue.js'
import { isStale, parseReadingTime } from '../utils/sensorStatus.js'
import { getReadingsLog } from '../api.js'

// สภาพแวดล้อมโรงเรือน — การ์ดใหญ่ 5 ค่า + สรุปเป็นประโยคให้อ่านรอบเดียวรู้เรื่อง
// สถานะมาจาก "ช่วงที่แนะนำ" ใน data/sensorValue.js ไม่ใช่เดาเอง
// สรุปของ Farmy Voice คำนวณจากค่าที่หลุดช่วง ไม่ได้เรียก AI (ไม่มีเน็ตก็ยังบอกได้)

const fmt = (v) => (typeof v === 'number' ? v.toLocaleString('th-TH', { maximumFractionDigits: 1 }) : v ?? '--')

// ต่อรายการเป็นประโยคไทย: a, b และ c
const joinTh = (arr) => (arr.length <= 1 ? arr[0] || '' : `${arr.slice(0, -1).join(' ')} และ${arr[arr.length - 1]}`)

// คำที่ใช้พูดถึงค่าที่หลุดช่วง — ใช้ say จากไฟล์ข้อมูลก่อน ไม่มีค่อยประกอบจากป้าย
function sayOf(c) {
  const say = c.info?.say
  if (say) return say[c.st.off] || say.rain || `${c.m.label}${c.st.label}`
  return `${c.m.label}${c.st.label}`
}

function statusOf(key, value) {
  const s = SENSOR_VALUE[key]
  if (value == null || !s) return { label: 'ไม่มีข้อมูล', tone: 'idle' }
  if (s.rainLevels) {
    const lv = s.rainLevels.find((l) => value <= l.max) || s.rainLevels[s.rainLevels.length - 1]
    return { label: lv.label, tone: lv.tone }
  }
  if (!s.good) return { label: 'ไม่มีข้อมูล', tone: 'idle' }
  if (value < s.good.min) return { label: s.low || 'ต่ำเกินไป', tone: 'watch', off: 'low' }
  if (value > s.good.max) return { label: s.high || 'สูงเกินไป', tone: 'watch', off: 'high' }
  return { label: 'อยู่ในช่วงปกติ', tone: 'ok' }
}

export default function BarnEnvironment() {
  const { weather, weatherUpdatedAt } = useLiveData()
  const stale = isStale(weather?.reading_time)
  const [rain24, setRain24] = useState(null)

  // ฝนสะสม 24 ชม. — การ์ดฝนดูค่าเดียวไม่พอ ต้องรู้ว่าตกมาเท่าไหร่แล้ว
  useEffect(() => {
    getReadingsLog({ hours: 24, pageSize: 100 })
      .then((d) => {
        const rows = d?.rows || []
        if (!rows.length) return setRain24(null)
        setRain24(rows.reduce((sum, r) => sum + (Number(r.rainfall) || 0), 0))
      })
      .catch(() => setRain24(null))
  }, [weather?.reading_time])

  const cards = METRICS.map((m) => {
    const value = weather?.[m.key] ?? null
    return { m, value, st: statusOf(m.key, value), info: SENSOR_VALUE[m.key] }
  })

  // ประโยคสรุป: เอาเฉพาะค่าที่หลุดช่วง ถ้าปกติหมดก็บอกว่าปกติ
  const issues = cards.filter((c) => c.st.tone === 'watch' || c.st.tone === 'bad')
  const summary = !weather
    ? 'กำลังโหลดข้อมูลเซนเซอร์…'
    : issues.length === 0
      ? 'ตอนนี้ทุกค่าอยู่ในช่วงที่แนะนำ สภาพแวดล้อมในโรงเรือนปกติดีครับ'
      : `ตอนนี้${joinTh(issues.map(sayOf))} แนะนำให้ตรวจสอบ${joinTh([...new Set(issues.map((c) => c.info?.fix).filter(Boolean))])}ครับ`

  const readingDate = parseReadingTime(weather?.reading_time)
  const when = readingDate
    ? new Date(readingDate).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : weather?.reading_time || '—'

  return (
    <section className="be">
      <header className="be-head">
        <div>
          <h1 className="be-title">สภาพแวดล้อมโรงเรือน</h1>
          <p className="be-sub">ค่าจากเซนเซอร์ในฟาร์ม · อัปเดตอัตโนมัติ</p>
        </div>
        <span className={`be-when ${stale ? 'stale' : ''}`}>
          <i className={`ti ${stale ? 'ti-alert-triangle' : 'ti-point-filled'}`} aria-hidden="true" />
          {stale ? 'ข้อมูลล่าสุด ' : 'อัปเดตล่าสุด '}{when}
        </span>
        <Link to="/sensors" className="btn-clear be-graph"><i className="ti ti-chart-line" aria-hidden="true" /> ดูกราฟย้อนหลัง</Link>
      </header>

      <div className="be-cards">
        {cards.map(({ m, value, st, info }) => (
          <div className={`be-card tone-${st.tone}`} key={m.key} style={{ '--c': m.color }}>
            <div className="be-card-top">
              <span className="be-card-icon"><i className={`ti ${m.icon}`} aria-hidden="true" /></span>
              <div>
                <div className="be-card-name">{m.label}</div>
                <div className="be-card-unit">{m.unit}</div>
              </div>
            </div>
            <div className="be-card-value">{fmt(value)}</div>
            <span className={`be-status tone-${st.tone}`}>
              <i className={`ti ${st.tone === 'ok' ? 'ti-circle-check' : st.tone === 'idle' ? 'ti-help-circle' : 'ti-alert-circle'}`} aria-hidden="true" />
              {st.label}
            </span>
            <div className="be-card-range">
              {info?.good
                ? `ช่วงแนะนำ ${info.good.min} – ${info.good.max} ${m.unit}`
                : rain24 != null ? `รวม 24 ชม. ${fmt(rain24)} ${m.unit}` : 'ดูปริมาณสะสมที่หน้ากราฟ'}
            </div>
          </div>
        ))}
      </div>

      <div className="be-summary">
        <img src="/guide/piglet.webp" alt="" className="be-pig" />
        <div className="be-summary-text">
          <div className="be-summary-title">Farmy Voice สรุปให้</div>
          <p>{summary}</p>
        </div>
        <button type="button" className="ask-btn be-ask" onClick={() => window.dispatchEvent(new Event('farmy:chat-open'))}>
          <i className="ti ti-microphone" aria-hidden="true" /> ถามเพิ่มเติม
        </button>
      </div>

      <div className="be-cost">
        <div className="be-cost-head">
          <span>ข้อมูลเหล่านี้ช่วยลดต้นทุนอะไร?</span>
          <Link to="/sensors" className="be-cost-more">ดูรายละเอียด <i className="ti ti-chevron-right" aria-hidden="true" /></Link>
        </div>
        <div className="be-cost-grid">
          {COST_ITEMS.map((c) => (
            <div className="be-cost-item" key={c.label}>
              <span className="be-cost-icon"><i className={`ti ${c.icon}`} aria-hidden="true" /></span>
              <div>
                <b>{c.label}</b>
                <small>{c.desc}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      {weatherUpdatedAt && <div className="be-foot">ดึงข้อมูลล่าสุด {weatherUpdatedAt.toLocaleTimeString('th-TH')}</div>}
    </section>
  )
}

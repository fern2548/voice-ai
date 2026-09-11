import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { getLabSources, getLabLatest, getLabSeries, getLabSummary } from '../api.js'
import usePolling from '../hooks/usePolling.js'

// หน้า "กราฟข้อมูล" — ค่าตอนนี้ + กราฟย้อนหลังของชุดข้อมูลจาก lab.plotnexuslab.com
// เลือกได้ 3 อย่าง: ชุดข้อมูล · ค่าที่ดู · ช่วงเวลา และรับค่าจาก URL ด้วย
// เพื่อให้สั่งเสียงว่า "เปิดกราฟเล้า R" แล้วมาถึงพร้อมตั้งค่าให้เสร็จ

const HOURS = [
  { h: 6, label: '6 ชม.' },
  { h: 24, label: '24 ชม.' },
  { h: 72, label: '3 วัน' },
  { h: 168, label: '7 วัน' },
]

// สีแยกเส้นตามจุดติดตั้ง — ชุดหนึ่งมีไม่เกิน 3 จุด
const LINE_COLORS = ['#4aca89', '#4da6ff', '#ffc857', '#ff6b6b']

const fmtTime = (iso, hours) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const hm = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  if (hours <= 24) return hm
  // ช่วงยาวกว่าหนึ่งวัน ต้องเห็นวันที่ด้วย ไม่งั้นแกนเวลาวนซ้ำ
  return `${d.getDate()}/${d.getMonth() + 1} ${hm}`
}

export default function SensorsPage() {
  const [params, setParams] = useSearchParams()
  const [catalog, setCatalog] = useState(null)   // ชุดข้อมูล + ค่าที่วัดได้
  const [series, setSeries] = useState(null)
  const [seriesErr, setSeriesErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState(null)   // ตารางต่ำสุด/เฉลี่ย/สูงสุดของทุกค่า

  const source = params.get('source') || 'pig'
  const hours = Number(params.get('hours')) || 24
  const measureParam = params.get('measure') || ''
  const locationParam = params.get('location') || ''

  const setParam = (k, v) => {
    const next = new URLSearchParams(params)
    next.set(k, v)
    setParams(next, { replace: true })
  }

  useEffect(() => {
    let alive = true
    getLabSources().then((d) => alive && setCatalog(d)).catch(() => alive && setCatalog({ enabled: false, sources: [] }))
    return () => { alive = false }
  }, [])

  const src = useMemo(
    () => catalog?.sources?.find((s) => s.id === source) || catalog?.sources?.[0] || null,
    [catalog, source],
  )
  // ค่าที่ดู: รับทั้ง id จริงและรหัสสั้นจาก URL ("temperature" ใช้ได้ทุกชุด)
  // ไม่มีในชุดนี้ก็เอาตัวแรก — เช่นสลับจากเล้าหมูไปดิน ค่า "แอมโมเนีย" ไม่มี ก็ไปดูค่าแรกของดินแทน
  const measure = useMemo(() => {
    if (!src) return ''
    const hit = src.measures.find((m) => m.id === measureParam || m.short === measureParam)
    return hit ? hit.id : (src.measures[0]?.id || '')
  }, [src, measureParam])

  // จุดติดตั้งที่เลือก: ต้องมีจริงในชุดนี้ ไม่งั้นถือว่าดูทุกจุด
  // (สลับจากเล้าหมูไปดิน ค่า barn_R ไม่มีในดิน ก็กลับเป็นทุกจุด)
  const location = useMemo(() => {
    if (!src?.locations?.some((l) => l.id === locationParam)) return ''
    return locationParam
  }, [src, locationParam])

  // ค่าตอนนี้ — ถามซ้ำทุก 60 วิ เหมือนหน้าอื่น
  const { data: latest } = usePolling(() => getLabLatest(source, location), 60000, `${source}|${location}`)

  // กราฟ — ดึงใหม่เมื่อเปลี่ยนชุด/ค่า/ช่วงเวลา
  useEffect(() => {
    if (!src || !measure) return
    let alive = true
    setLoading(true)
    setSeriesErr('')
    getLabSeries(src.id, measure, hours, location)
      .then((d) => alive && setSeries(d))
      .catch(() => alive && setSeriesErr('ดึงข้อมูลย้อนหลังไม่ได้ ลองใหม่อีกครั้ง'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [src?.id, measure, hours, location])

  // ตารางสรุป — ดึงพร้อมกราฟ เปลี่ยนชุด/ช่วงเวลาก็ดึงใหม่ (ไม่ขึ้นกับค่าที่เลือก เพราะสรุปทุกค่า)
  useEffect(() => {
    if (!src) return
    let alive = true
    getLabSummary(src.id, hours, location)
      .then((d) => alive && setSummary(d))
      .catch(() => alive && setSummary(null))
    return () => { alive = false }
  }, [src?.id, hours, location])

  // รวมทุกเส้นเข้าเป็นแถวเดียวกันตามเวลา ให้ recharts วาดหลายเส้นในกราฟเดียว
  const chartRows = useMemo(() => {
    if (!series?.lines?.length) return []
    const byTime = new Map()
    series.lines.forEach((ln, i) => {
      ln.points.forEach((p) => {
        const row = byTime.get(p.t) || { t: p.t }
        row[`s${i}`] = p.v
        byTime.set(p.t, row)
      })
    })
    return [...byTime.values()].sort((a, b) => (a.t < b.t ? -1 : 1))
  }, [series])

  if (catalog && !catalog.enabled) {
    return (
      <div className="panel">
        <div className="panel-head"><span className="panel-title">กราฟข้อมูล · DATA</span></div>
        <div className="empty-note">ยังไม่ได้เปิดใช้กราฟข้อมูล — ผู้ดูแลต้องตั้งค่า LAB_API_KEY ที่เซิร์ฟเวอร์ก่อน</div>
      </div>
    )
  }

  const measureMeta = src?.measures.find((m) => m.id === measure)

  return (
    <>
      {/* เลือกชุดข้อมูล */}
      <div className="tab-bar">
        {(catalog?.sources || []).map((s) => (
          <button
            key={s.id}
            className={`tab-btn ${s.id === src?.id ? 'on' : ''}`}
            onClick={() => { setParam('source', s.id) }}
          >
            <i className={`ti ${s.id === 'soil' ? 'ti-plant-2' : s.id === 'pig' ? 'ti-building-warehouse' : 'ti-antenna'}`} aria-hidden="true" />
            {s.label}
          </button>
        ))}
      </div>

      {/* เลือกจุดติดตั้ง — โชว์เฉพาะชุดที่มีมากกว่าหนึ่งจุด */}
      {src?.locations?.length > 1 && (
        <div className="chip-row sx-locs">
          <i className="ti ti-map-pin" aria-hidden="true" />
          <button
            className={`chip ${!location ? 'chip-on' : ''}`}
            onClick={() => setParam('location', '')}
          >
            ทุกจุด
          </button>
          {src.locations.map((l) => (
            <button
              key={l.id}
              className={`chip ${l.id === location ? 'chip-on' : ''}`}
              onClick={() => setParam('location', l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}

      {/* ค่าตอนนี้ แยกตามจุดติดตั้ง */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">ค่าตอนนี้ · {src?.label || '…'}</span>
          {latest?.updated_at && (
            <span className="sx-updated">
              อัปเดต {new Date(latest.updated_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        {!latest ? (
          <div className="empty-note">กำลังโหลด…</div>
        ) : (
          <div className="sx-sites">
            {latest.sites.map((site) => (
              <div className="sx-site" key={site.id}>
                <div className="sx-site-name">
                  <i className="ti ti-map-pin" aria-hidden="true" /> {site.label}
                </div>
                <div className="sx-vals">
                  {site.values.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`sx-val ${v.id === measure ? 'on' : ''}`}
                      onClick={() => setParam('measure', v.id)}
                      title="กดเพื่อดูกราฟค่านี้"
                    >
                      <span className="sx-val-label">{v.label}</span>
                      <span className="sx-val-num">
                        {typeof v.value === 'number' ? v.value.toLocaleString('th-TH', { maximumFractionDigits: 2 }) : v.value ?? '—'}
                        <small>{v.unit}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* กราฟย้อนหลัง */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">
            ย้อนหลัง · {measureMeta?.label || '…'}{measureMeta?.unit ? ` (${measureMeta.unit})` : ''}
          </span>
          <div className="chip-row">
            {HOURS.map((o) => (
              <button
                key={o.h}
                className={`chip ${o.h === hours ? 'chip-on' : ''}`}
                onClick={() => setParam('hours', String(o.h))}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="chip-row sx-measures">
          {(src?.measures || []).map((m) => (
            <button
              key={m.id}
              className={`chip ${m.id === measure ? 'chip-on' : ''}`}
              onClick={() => setParam('measure', m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="chart-wrap">
          {seriesErr ? (
            <div className="empty-note">{seriesErr}</div>
          ) : loading && !series ? (
            <div className="empty-note">กำลังโหลดกราฟ…</div>
          ) : chartRows.length === 0 ? (
            <div className="empty-note">ไม่มีข้อมูลในช่วงนี้</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartRows} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="var(--grid-line)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="t"
                  tickFormatter={(t) => fmtTime(t, hours)}
                  stroke="var(--text-dim)"
                  fontSize={12}
                  tick={{ fill: 'var(--text-dim)' }}
                  minTickGap={40}
                />
                <YAxis
                  stroke="var(--text-dim)"
                  fontSize={12}
                  tick={{ fill: 'var(--text-dim)' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  labelFormatter={(t) => new Date(t).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                  formatter={(v) => [`${v}${series?.unit || ''}`]}
                  contentStyle={{
                    background: 'var(--panel-3)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text)',
                  }}
                  labelStyle={{ color: 'var(--text-dim)' }}
                />
                {series.lines.length > 1 && <Legend />}
                {series.lines.map((ln, i) => (
                  <Line
                    key={ln.site}
                    type="monotone"
                    dataKey={`s${i}`}
                    name={ln.label}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2.2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="panel-foot">
          {series
            ? `${series.lines.reduce((n, l) => n + l.points.length, 0)} ค่า · ${series.lines.length} จุดติดตั้ง · ข้อมูลจาก lab.plotnexuslab.com`
            : ''}
        </div>
      </div>

      {/* ตารางสรุปทุกค่าในช่วงที่เลือก — กดแถวไหนก็สลับกราฟไปดูค่านั้น */}
      {summary?.rows?.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">สรุป · {summary.period || `ย้อนหลัง ${hours} ชม.`}</span>
            <span className="sx-updated">ต่ำสุด / เฉลี่ย / สูงสุด</span>
          </div>
          <div className="table-wrap">
            <table className="data-table sx-table">
              <thead>
                <tr>
                  <th>ค่า</th>
                  <th>จุดติดตั้ง</th>
                  <th className="num">ต่ำสุด</th>
                  <th className="num">เฉลี่ย</th>
                  <th className="num">สูงสุด</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((r) => (
                  <tr
                    key={`${r.site}-${r.id}`}
                    className={r.id === measure ? 'on' : ''}
                    onClick={() => setParam('measure', r.id)}
                    title="กดเพื่อดูกราฟค่านี้"
                  >
                    <td>{r.label}</td>
                    <td className="dim">{r.site_label}</td>
                    <td className="num">{r.min}<small>{r.unit}</small></td>
                    <td className="num strong">{r.avg}<small>{r.unit}</small></td>
                    <td className="num">{r.max}<small>{r.unit}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

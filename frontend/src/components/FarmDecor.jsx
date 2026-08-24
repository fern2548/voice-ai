// ภาพตกแต่งทั้งหมดวาดเป็น inline SVG — ไม่ต้องพึ่งไฟล์ภาพภายนอก และเปลี่ยนสีตามธีมได้

// โลโก้: หมูในวงกลม + คลื่นเสียง (แบบเดียวกับหัวมุมซ้ายบนของดีไซน์)
export function FarmyLogo() {
  return (
    <svg className="farmy-logo-svg" viewBox="0 0 64 64" role="img" aria-label="Farmy Voice">
      <circle cx="30" cy="32" r="21" fill="none" stroke="currentColor" strokeWidth="2.4" />
      {/* หน้าหมู */}
      <ellipse cx="27" cy="34" rx="12" ry="10" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M18 26 L16 19 L23 22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M36 26 L38 19 L31 22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <ellipse cx="27" cy="37" rx="5" ry="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="25.4" cy="37" r="1.1" fill="currentColor" />
      <circle cx="28.6" cy="37" r="1.1" fill="currentColor" />
      <circle cx="22" cy="30" r="1.4" fill="currentColor" />
      <circle cx="32" cy="30" r="1.4" fill="currentColor" />
      {/* คลื่นเสียงด้านขวา */}
      <path d="M46 24 a12 12 0 0 1 0 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M51 19 a19 19 0 0 1 0 26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

// ทิวทัศน์ฟาร์มมุมล่างของเมนูซ้าย (เนินเขา + ยุ้งฉาง + ไซโล + หมู)
export function FarmScene() {
  return (
    <svg className="farm-scene-svg" viewBox="0 0 240 170" role="presentation" aria-hidden="true">
      {/* เนินเขาไล่ระดับ */}
      <path d="M0 92 Q52 62 104 84 T240 70 L240 170 L0 170 Z" fill="currentColor" opacity="0.10" />
      <path d="M0 112 Q64 86 128 106 T240 96 L240 170 L0 170 Z" fill="currentColor" opacity="0.16" />
      {/* ไซโล */}
      <path d="M150 76 a9 9 0 0 1 18 0 v40 h-18 z" fill="currentColor" opacity="0.30" />
      {/* ยุ้งฉาง */}
      <path d="M178 96 h44 v34 h-44 z" fill="currentColor" opacity="0.34" />
      <path d="M174 96 L200 78 L226 96 z" fill="currentColor" opacity="0.42" />
      <rect x="195" y="112" width="10" height="18" fill="currentColor" opacity="0.16" />
      {/* ต้นไม้ */}
      <circle cx="58" cy="104" r="13" fill="currentColor" opacity="0.26" />
      <rect x="56" y="112" width="4" height="16" fill="currentColor" opacity="0.30" />
      {/* พื้นหญ้าหน้าสุด */}
      <path d="M0 132 Q60 118 120 130 T240 124 L240 170 L0 170 Z" fill="currentColor" opacity="0.22" />
      {/* หมูยืนกินหญ้า */}
      <g fill="currentColor" opacity="0.45">
        <ellipse cx="78" cy="146" rx="26" ry="15" />
        <ellipse cx="103" cy="139" rx="12" ry="10" />
        <path d="M97 130 l-3 -8 l8 4 z" />
        <ellipse cx="113" cy="141" rx="4" ry="3" />
        <rect x="60" y="156" width="5" height="11" rx="2" />
        <rect x="74" y="157" width="5" height="10" rx="2" />
        <rect x="88" y="156" width="5" height="11" rx="2" />
        <path d="M53 140 q-8 -5 -4 -11 q6 3 6 9 z" />
      </g>
    </svg>
  )
}

// คลื่นเสียงสเปกตรัมข้าง hero — แท่งสูงต่ำไม่เท่ากันแบบเสียงจริง สะท้อนบน-ล่าง
// ค่าความสูงคงที่ (ไม่สุ่มใหม่ทุกครั้งที่ re-render) จะได้ไม่กระพริบเวลา state เปลี่ยน
const WAVE_HEIGHTS = [
  4, 7, 5, 10, 6, 14, 9, 20, 12, 26, 16, 34, 22, 44, 28, 56, 34, 68, 40, 82,
  30, 62, 24, 48, 34, 70, 26, 52, 38, 78, 30, 58, 44, 90, 34, 66, 26, 50, 20, 40,
  30, 60, 22, 44, 16, 34, 26, 52, 18, 36, 12, 26, 20, 40, 14, 28, 10, 20, 7, 14,
]

export function HeroWave({ side = 'left', active = false }) {
  // หยิบแท่งเว้นแท่ง (60 -> 30) ให้ลายโปร่งขึ้น ไม่รกตา
  const sparse = WAVE_HEIGHTS.filter((_, i) => i % 2 === 0)
  const n = sparse.length
  const bars = side === 'right' ? [...sparse].reverse() : sparse
  const gid = `wg-${side}`
  // ซ้าย = ฟ้า, ขวา = ม่วง-ชมพู (ไล่สีข้ามหน้าจอตามดีไซน์)
  const stops = side === 'right'
    ? [['#f0abfc', 0.15], ['#c026d3', 0.85], ['#e879f9', 1]]
    : [['#312e81', 0.15], ['#3b9dff', 0.85], ['#7cc6ff', 1]]
  return (
    <svg
      className={`hero-wave-svg ${side} ${active ? 'on' : ''}`}
      viewBox={`0 0 ${n * 6} 200`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1={side === 'right' ? '1' : '0'} y1="0" x2={side === 'right' ? '0' : '1'} y2="0">
          {stops.map(([c, o], i) => (
            <stop key={i} offset={`${i === 0 ? 0 : i === 1 ? 45 : 100}%`} stopColor={c} stopOpacity={o} />
          ))}
        </linearGradient>
      </defs>
      <g fill={`url(#${gid})`}>
        {bars.map((h, i) => (
          <rect
            key={i}
            x={i * 6}
            y={100 - h}
            width="1.6"
            height={h * 2}
            rx="1.3"
            style={active ? { animationDelay: `${(i % 9) * 0.07}s` } : undefined}
          />
        ))}
      </g>
    </svg>
  )
}

// ริบบิ้นแสงโค้งพาดพื้นหลัง — ซ้ายฟ้า ขวาม่วง/ชมพู
export function HeroRibbons() {
  return (
    <svg className="hero-ribbons" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="rb-blue" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0" />
          <stop offset="45%" stopColor="#3b9dff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#67e8f9" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="rb-pink" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#701a75" stopOpacity="0" />
          <stop offset="45%" stopColor="#d946ef" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f0abfc" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* ลดจากเดิมข้างละ 5 เส้น เหลือข้างละ 2 เส้น: เส้นคมหลัก 1 + แถบฟุ้งกว้าง 1 */}
      <g fill="none" strokeLinecap="round">
        {/* ฝั่งซ้าย ฟ้า — เส้นโค้ง S กว้าง ๆ พาดจากขอบซ้ายเข้ากลาง */}
        <path d="M-220 380 C 90 250, 210 590, 500 470 S 750 390, 850 430" stroke="url(#rb-blue)" strokeWidth="3" opacity="0.55" />
        <path d="M-280 170 C 140 20, 280 340, 560 220 S 800 150, 880 210" stroke="url(#rb-blue)" strokeWidth="26" opacity="0.07" />
        {/* ฝั่งขวา ม่วง-ชมพู (สะท้อนกระจก) */}
        <path d="M1820 380 C 1510 250, 1390 590, 1100 470 S 850 390, 750 430" stroke="url(#rb-pink)" strokeWidth="3" opacity="0.55" />
        <path d="M1880 170 C 1460 20, 1320 340, 1040 220 S 800 150, 720 210" stroke="url(#rb-pink)" strokeWidth="26" opacity="0.07" />
      </g>
    </svg>
  )
}

// ทรงกลมลายจุด (wireframe dot sphere) — เส้นเมริเดียน + เส้นละติจูด วาดเป็นเส้นประจุด
export function DotSphere({ active = false }) {
  const R = 150
  const CX = 170
  const CY = 170
  const meridians = []
  const latitudes = []

  // เส้นเมริเดียน: วงรีความกว้างไล่จากเต็มวงไปจนแบน ทำให้ดูเป็นทรงกลม
  for (let i = 0; i < 14; i++) {
    const t = (i / 14) * Math.PI
    const rx = Math.abs(Math.cos(t)) * R
    meridians.push({ rx: Math.max(rx, 0.5), key: `m${i}`, op: 0.25 + Math.abs(Math.cos(t)) * 0.55 })
  }
  // เส้นละติจูด: วงรีความสูงต่าง ๆ เรียงจากบนลงล่าง
  for (let i = 1; i < 11; i++) {
    const t = (i / 11) * Math.PI
    const ry = Math.sin(t) * R * 0.36
    const rx = Math.sin(t) * R
    const cy = CY - Math.cos(t) * R
    latitudes.push({ rx, ry, cy, key: `l${i}`, op: 0.2 + Math.sin(t) * 0.5 })
  }

  return (
    <svg
      className={`dot-sphere ${active ? 'on' : ''}`}
      viewBox="0 0 340 340"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="ds-glow" cx="50%" cy="46%" r="52%">
          <stop offset="0%" stopColor="#7cc6ff" stopOpacity="0.30" />
          <stop offset="62%" stopColor="#2563eb" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#0b1a44" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ds-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#bfe4ff" />
          <stop offset="55%" stopColor="#4d9dff" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
      </defs>

      {/* แสงฟุ้งด้านใน */}
      <circle cx={CX} cy={CY} r={R * 1.02} fill="url(#ds-glow)" />

      <g
        className="ds-rings"
        fill="none"
        stroke="url(#ds-line)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="0.6 5"
      >
        {meridians.map((m) => (
          <ellipse key={m.key} cx={CX} cy={CY} rx={m.rx} ry={R} opacity={m.op} />
        ))}
        {latitudes.map((l) => (
          <ellipse key={l.key} cx={CX} cy={l.cy} rx={l.rx} ry={l.ry} opacity={l.op} />
        ))}
      </g>

      {/* ขอบวงนอกจาง ๆ */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#5aa6ff" strokeWidth="1" opacity="0.35" />
    </svg>
  )
}

// คลื่นเสียงโค้งสองข้างไอคอนไมค์ (( 🎤 ))
export function MicWaves({ side = 'left' }) {
  const flip = side === 'right'
  return (
    <svg
      className={`mic-waves ${side}`}
      viewBox="0 0 26 44"
      aria-hidden="true"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path d="M18 13 a13 13 0 0 0 0 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M9 7 a21 21 0 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

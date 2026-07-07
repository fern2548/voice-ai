// นิยามตัวแปรวัดทั้งหมดไว้ที่เดียว — ช่วงค่า (min/max) ใช้กับ gauge, สีตามระดับ
export const METRICS = [
  {
    key: 'temperature',
    label: 'อุณหภูมิ',
    unit: '°C',
    icon: '🌡️',
    min: 0,
    max: 50,
    // ช่วงเตือน: ปกติ / เฝ้าระวัง / อันตราย
    zones: [
      { limit: 35, level: 'ok' },
      { limit: 42, level: 'warn' },
      { limit: 50, level: 'danger' },
    ],
  },
  {
    key: 'humidity',
    label: 'ความชื้น',
    unit: '%',
    icon: '💧',
    min: 0,
    max: 100,
    zones: [
      { limit: 80, level: 'ok' },
      { limit: 90, level: 'warn' },
      { limit: 100, level: 'danger' },
    ],
  },
  {
    key: 'windspeed',
    label: 'ความเร็วลม',
    unit: 'm/s',
    icon: '💨',
    min: 0,
    max: 20,
    zones: [
      { limit: 10, level: 'ok' },
      { limit: 15, level: 'warn' },
      { limit: 20, level: 'danger' },
    ],
  },
  {
    key: 'rainfall',
    label: 'ปริมาณฝน',
    unit: 'mm',
    icon: '🌧️',
    min: 0,
    max: 50,
    zones: [
      { limit: 10, level: 'ok' },
      { limit: 30, level: 'warn' },
      { limit: 50, level: 'danger' },
    ],
  },
  {
    key: 'light',
    label: 'ความเข้มแสง',
    unit: 'lux',
    icon: '☀️',
    min: 0,
    max: 2000,
    zones: [
      { limit: 2000, level: 'ok' },
      { limit: 2000, level: 'ok' },
      { limit: 2000, level: 'ok' },
    ],
  },
]

// คืนระดับ (ok/warn/danger) ตามค่าที่วัดได้
export function levelOf(metric, value) {
  if (value == null) return 'idle'
  for (const z of metric.zones) {
    if (value <= z.limit) return z.level
  }
  return 'danger'
}

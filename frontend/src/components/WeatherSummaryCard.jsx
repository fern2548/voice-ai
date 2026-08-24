import { useLiveData } from '../context/LiveData.jsx'
import { isStale } from '../utils/sensorStatus.js'

export default function WeatherSummaryCard() {
  const { weather: data } = useLiveData()
  const stale = isStale(data?.reading_time)
  const v = (x, unit) => (stale || x == null ? '--' : `${x}${unit}`)

  return (
    <div className="side-card">
      <div className="side-card-head">ข้อมูลสภาพอากาศวันนี้</div>
      <div className="weather-summary-main">
        <div className="weather-summary-temp">{v(data?.temperature, '°C')}</div>
        <i className="ti ti-sun weather-summary-icon" aria-hidden="true" />
      </div>
      <div className="weather-summary-grid">
        <div>
          <div className="weather-summary-k">ความชื้น</div>
          <div className="weather-summary-v">{v(data?.humidity, '%')}</div>
        </div>
        <div>
          <div className="weather-summary-k">ลม</div>
          <div className="weather-summary-v">{v(data?.windspeed, ' m/s')}</div>
        </div>
        <div>
          <div className="weather-summary-k">ฝน</div>
          <div className="weather-summary-v">{v(data?.rainfall, ' mm')}</div>
        </div>
      </div>
    </div>
  )
}

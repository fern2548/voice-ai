import { createContext, useContext } from 'react'
import usePolling from '../hooks/usePolling.js'
import { getHealth, getWeather } from '../api.js'

// รวมการโพล /health และ /weather ไว้ที่เดียว แล้วแชร์ให้ทุก component ผ่าน context
// (กันการยิง request ซ้ำซ้อนจากหลาย component ที่ต้องการข้อมูลชุดเดียวกัน)
const LiveDataContext = createContext(null)

export function LiveDataProvider({ children }) {
  const health = usePolling(getHealth, 30000)
  const weather = usePolling(getWeather, 30000)

  const value = {
    health: health.data,
    healthError: health.error,
    weather: weather.data,
    weatherUpdatedAt: weather.updatedAt,
  }

  return <LiveDataContext.Provider value={value}>{children}</LiveDataContext.Provider>
}

export function useLiveData() {
  const ctx = useContext(LiveDataContext)
  if (!ctx) throw new Error('useLiveData ต้องอยู่ภายใต้ <LiveDataProvider>')
  return ctx
}

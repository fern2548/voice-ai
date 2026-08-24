import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'farmy-voice-theme'

function initialTheme() {
  if (typeof window === 'undefined') return 'dark'
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  // ครั้งแรกให้ตามการตั้งค่าของเครื่องผู้ใช้
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * จัดการธีมสว่าง/มืด — สลับคลาส `dark` ที่ <html> แล้วจำไว้ใน localStorage
 * (สคริปต์เล็ก ๆ ใน index.html ตั้งคลาสให้ก่อนแล้ว กันจอกระพริบตอนโหลด)
 */
export function useTheme() {
  const [theme, setTheme] = useState(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, setTheme, toggleTheme, isDark: theme === 'dark' }
}

export default useTheme

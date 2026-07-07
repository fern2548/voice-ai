import { useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import StatusBar from './components/scada/StatusBar.jsx'
import ChatWidget from './components/ChatWidget.jsx'
import SensorAlert from './components/SensorAlert.jsx'
import ConnectionAlert from './components/ConnectionAlert.jsx'
import OverviewPage from './pages/OverviewPage.jsx'
import ForecastPage from './pages/ForecastPage.jsx'
import TrendComparePage from './pages/TrendComparePage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

const NAV = [
  { to: '/overview', icon: 'ti-layout-dashboard', label: 'Overview' },
  { to: '/forecast', icon: 'ti-cloud', label: 'Forecast' },
  { to: '/trend', icon: 'ti-chart-line', label: 'Predictive Insights' },
  { to: '/history', icon: 'ti-history', label: 'History' },
  { to: '/settings', icon: 'ti-settings', label: 'Settings' },
]

export default function App() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('nav-collapsed') === '1'
  )

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('nav-collapsed', next ? '1' : '0')
      return next
    })
  }

  return (
    <div className={`scada-root ${collapsed ? 'nav-collapsed' : ''}`}>
      <StatusBar />
      <div className="alert-stack">
        <ConnectionAlert />
        <SensorAlert />
      </div>

      <nav className="nav-rail">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className={`nav-item ${location.pathname === n.to ? 'active' : ''}`}
            title={n.label}
          >
            <span className="nav-icon"><i className={`ti ${n.icon}`} aria-hidden="true" /></span>
            <span className="nav-label">{n.label}</span>
          </Link>
        ))}
        <button
          className="nav-toggle"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`ti ${collapsed ? 'ti-chevrons-right' : 'ti-chevrons-left'}`} aria-hidden="true" />
        </button>
      </nav>

      <main className="scada-main">
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/forecast" element={<ForecastPage />} />
          <Route path="/trend" element={<TrendComparePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </main>

      <ChatWidget />
    </div>
  )
}

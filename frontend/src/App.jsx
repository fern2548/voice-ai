import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import StatusBar from './components/scada/StatusBar.jsx'
import SensorAlert from './components/SensorAlert.jsx'
import ConnectionAlert from './components/ConnectionAlert.jsx'
import VaccineDueAlert from './components/VaccineDueAlert.jsx'
import ChatWidget from './components/ChatWidget.jsx'
import { VoiceAIProvider } from './context/VoiceAI.jsx'
import { AdminAuthProvider } from './context/AdminAuth.jsx'
import AdminLoginGate from './components/AdminLoginGate.jsx'
import OverviewPage from './pages/OverviewPage.jsx'
import FeaturesPage from './pages/FeaturesPage.jsx'
import ForecastPage from './pages/ForecastPage.jsx'
import TrendComparePage from './pages/TrendComparePage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import PigHealthPage from './pages/PigHealthPage.jsx'
import VaccinePage from './pages/VaccinePage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

const NAV = [
  { to: '/overview', label: 'หน้าแรก' },
  { to: '/features', label: 'ทำอะไรได้บ้าง' },
  { to: '/pig-log', label: 'โรงเรือน' },
  { to: '/vaccine', label: 'วัคซีน' },
  { to: '/history', label: 'รายงาน' },
  { to: '/forecast', label: 'พยากรณ์อากาศ' },
  { to: '/settings', label: 'ตั้งค่า' },
]

function AppShell() {
  const location = useLocation()

  return (
    <VoiceAIProvider>
      <div className="app-root">
        <StatusBar navItems={NAV} currentPath={location.pathname} />

        <div className="alert-stack">
          <ConnectionAlert />
          <SensorAlert />
          <VaccineDueAlert />
        </div>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/forecast" element={<ForecastPage />} />
            <Route path="/trend" element={<TrendComparePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/pig-log" element={<PigHealthPage />} />
            <Route path="/vaccine" element={<VaccinePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </main>

        {location.pathname !== '/overview' && <ChatWidget />}
      </div>
    </VoiceAIProvider>
  )
}

export default function App() {
  return (
    <AdminAuthProvider>
      <AdminLoginGate>
        <AppShell />
      </AdminLoginGate>
    </AdminAuthProvider>
  )
}

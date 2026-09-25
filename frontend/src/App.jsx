import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import StatusBar from './components/scada/StatusBar.jsx'
import SensorAlert from './components/SensorAlert.jsx'
import ConnectionAlert from './components/ConnectionAlert.jsx'
import VaccineDueAlert from './components/VaccineDueAlert.jsx'
import ChatWidget from './components/ChatWidget.jsx'
import { VoiceAIProvider } from './context/VoiceAI.jsx'
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuth.jsx'
import AdminLoginGate from './components/AdminLoginGate.jsx'
import OverviewPage from './pages/OverviewPage.jsx'
import FeaturesPage from './pages/FeaturesPage.jsx'
import ForecastPage from './pages/ForecastPage.jsx'
import TrendComparePage from './pages/TrendComparePage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import PigHealthPage from './pages/PigHealthPage.jsx'
import VaccinePage from './pages/VaccinePage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import SensorsPage from './pages/SensorsPage.jsx'
import VaccineGuidePage from './pages/VaccineGuidePage.jsx'
import DiseaseFmdPage from './pages/DiseaseFmdPage.jsx'
import VaccineInfoPage from './pages/VaccineInfoPage.jsx'
import TasksPage from './pages/TasksPage.jsx'
import VetCommunityPage from './pages/VetCommunityPage.jsx'
import VaccinePlanPage from './pages/VaccinePlanPage.jsx'

// internal: true = เฉพาะคนในบริษัท (ต้องล็อกอิน) — คนนอกเห็นแต่เมนูข้อมูลปกติ
const NAV = [
  { to: '/overview', label: 'หน้าแรก' },
  { to: '/features', label: 'ทำอะไรได้บ้าง' },
  { to: '/tasks', label: 'งานวันนี้', internal: true },
  { to: '/pig-log', label: 'โรงเรือน', internal: true },
  { to: '/vaccine', label: 'วัคซีน', internal: true },
  { to: '/vet', label: 'ปรึกษาสัตวแพทย์', internal: true },
  { to: '/vaccine-plan', label: 'แผนวัคซีนตามอายุ', internal: true },
  { to: '/vaccine-info', label: 'ข้อมูลวัคซีน' },
  { to: '/vaccine-guide', label: 'วิธีฉีดวัคซีน' },
  { to: '/disease-fmd', label: 'อาการปากเท้าเปื่อย' },
  { to: '/history', label: 'รายงาน' },
  { to: '/forecast', label: 'สภาพอากาศ · พยากรณ์' },
  { to: '/sensors', label: 'กราฟข้อมูล' },
  { to: '/settings', label: 'ตั้งค่า', internal: true },
]

function AppShell() {
  const location = useLocation()
  const { isAdmin } = useAdminAuth()
  const nav = isAdmin ? NAV : NAV.filter((n) => !n.internal)

  return (
    <VoiceAIProvider>
      <div className="app-root">
        <StatusBar navItems={nav} currentPath={location.pathname} />

        <div className="alert-stack">
          <ConnectionAlert />
          <SensorAlert />
          {isAdmin && <VaccineDueAlert />}
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
            <Route path="/vaccine-guide" element={<VaccineGuidePage />} />
            <Route path="/vaccine-info" element={<VaccineInfoPage />} />
            <Route path="/disease-fmd" element={<DiseaseFmdPage />} />
            <Route path="/vet" element={<VetCommunityPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/vaccine-plan" element={<VaccinePlanPage />} />
            <Route path="/sensors" element={<SensorsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </main>

        {/* กล่องเสียงลอยมุมขวาล่าง — มีทุกหน้ารวมหน้าแรก จะได้กดถามได้จากทุกที่โดยไม่ต้องเลื่อนหาไมค์ */}
        <ChatWidget />
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

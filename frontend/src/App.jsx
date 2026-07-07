import { useState } from 'react'
import StatusBar from './components/scada/StatusBar.jsx'
import MetricGauges from './components/scada/MetricGauges.jsx'
import TrendChart from './components/scada/TrendChart.jsx'
import SettingsPanel from './components/scada/SettingsPanel.jsx'
import PredictTable from './components/PredictTable.jsx'
import PredictionHistoryTable from './components/PredictionHistoryTable.jsx'
import ChatWidget from './components/ChatWidget.jsx'

const NAV = [
  { id: 'overview', icon: '▣', label: 'Overview' },
  { id: 'forecast', icon: '◈', label: 'Forecast' },
  { id: 'accuracy', icon: '▤', label: 'History' },
  { id: 'settings', icon: '⚙', label: 'Settings' },
]

export default function App() {
  const [page, setPage] = useState('overview')
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

      <nav className="nav-rail">
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-item ${page === n.id ? 'active' : ''}`}
            onClick={() => setPage(n.id)}
            title={n.label}
          >
            <span className="nav-icon">{n.icon}</span>
            <span className="nav-label">{n.label}</span>
          </button>
        ))}
        <button
          className="nav-toggle"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </nav>

      <main className="scada-main">
        {page === 'overview' && (
          <>
            <MetricGauges />
            <TrendChart />
          </>
        )}
        {page === 'forecast' && <PredictTable />}
        {page === 'accuracy' && <PredictionHistoryTable />}
        {page === 'settings' && <SettingsPanel />}
      </main>

      <ChatWidget />
    </div>
  )
}

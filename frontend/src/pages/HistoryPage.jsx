import { useState } from 'react'
import RawReadingsTable from '../components/RawReadingsTable.jsx'
import PredictionHistoryTable from '../components/PredictionHistoryTable.jsx'
import TrendChart from '../components/scada/TrendChart.jsx'

const TABS = [
  { id: 'raw', label: 'ข้อมูลดิบ', icon: 'ti-database' },
  { id: 'compare', label: 'ข้อมูลเทียบ', icon: 'ti-arrows-diff' },
]

export default function HistoryPage() {
  const [tab, setTab] = useState('raw')

  return (
    <>
      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <i className={`ti ${t.icon}`} aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      <TrendChart />

      {tab === 'raw' ? <RawReadingsTable /> : <PredictionHistoryTable />}
    </>
  )
}

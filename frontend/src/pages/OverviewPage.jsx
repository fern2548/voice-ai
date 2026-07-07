import MetricGauges from '../components/scada/MetricGauges.jsx'
import TrendChart from '../components/scada/TrendChart.jsx'

export default function OverviewPage() {
  return (
    <>
      <MetricGauges />
      <TrendChart />
    </>
  )
}

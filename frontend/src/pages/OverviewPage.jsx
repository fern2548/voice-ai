import MetricGauges from '../components/scada/MetricGauges.jsx'
import VoiceAIPanel from '../components/VoiceAIPanel.jsx'

export default function OverviewPage() {
  return (
    <>
      <div className="hero-voice-wrap">
        <VoiceAIPanel />
      </div>
      <MetricGauges />
    </>
  )
}

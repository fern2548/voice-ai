import VaccineDuePanel from '../components/VaccineDuePanel.jsx'
import VaccineLog from '../components/VaccineLog.jsx'
import VaccineFollowup from '../components/VaccineFollowup.jsx'

export default function VaccinePage() {
  return (
    <>
      <VaccineDuePanel />
      <VaccineFollowup />
      <VaccineLog />
    </>
  )
}

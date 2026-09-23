import BarnEnvironment from '../components/BarnEnvironment.jsx'
import PredictTable from '../components/PredictTable.jsx'

/** สภาพแวดล้อมตอนนี้ + พยากรณ์ล่วงหน้า อยู่หน้าเดียวกัน จะได้เทียบกันได้เลย */
export default function ForecastPage() {
  return (
    <>
      <BarnEnvironment />
      <PredictTable />
    </>
  )
}

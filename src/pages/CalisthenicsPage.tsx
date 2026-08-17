import { Link } from 'react-router-dom'
import CalisthenicsSection from '../components/CalisthenicsSection'

export default function CalisthenicsPage() {
  return (
    <div className="space-y-4 pb-4 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Your training</p>
          <h1 className="text-2xl font-extrabold">Calisthenics</h1>
        </div>
        <Link
          to="/hiit"
          className="rounded-full bg-orange/15 px-3 py-1.5 text-xs font-bold text-orange border border-orange/30"
        >
          ⚡ HIIT
        </Link>
      </div>

      <CalisthenicsSection />
    </div>
  )
}

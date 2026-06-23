import CalisthenicsSection from '../components/CalisthenicsSection'

export default function CalisthenicsPage() {
  return (
    <div className="space-y-4 pb-4 fade-in">
      <div>
        <p className="text-sm text-muted">Your training</p>
        <h1 className="text-2xl font-extrabold">Calisthenics</h1>
      </div>

      <CalisthenicsSection />
    </div>
  )
}

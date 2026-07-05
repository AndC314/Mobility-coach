import BjjSkillsSection from '../components/BjjSkillsSection'
import BjjSplitTimer from '../components/BjjSplitTimer'

export default function Bjj() {
  return (
    <div className="space-y-4 pb-4 fade-in">
      <div>
        <p className="text-sm text-muted">Your training</p>
        <h1 className="text-2xl font-extrabold">BJJ</h1>
      </div>

      <BjjSplitTimer />

      <BjjSkillsSection />
    </div>
  )
}

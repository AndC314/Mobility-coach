import { useState } from 'react'
import { Link } from 'react-router-dom'
import CalisthenicsSection, { type BulkPrefill } from '../components/CalisthenicsSection'
import TodayStrengthCard from '../components/TodayStrengthCard'
import type { SessionExercise } from '../lib/calisthenicsSession'

export default function CalisthenicsPage() {
  const [prefill, setPrefill] = useState<BulkPrefill | null>(null)

  function handleStartSession(exercises: SessionExercise[]) {
    setPrefill({
      exercises: exercises.map((ex) => ({
        id: ex.exerciseId,
        value: ex.targetValue,
        sets: ex.targetSets,
      })),
    })
  }

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

      <TodayStrengthCard onStartSession={handleStartSession} />

      <CalisthenicsSection prefill={prefill} onPrefillConsumed={() => setPrefill(null)} />
    </div>
  )
}

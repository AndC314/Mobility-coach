import { useState } from 'react'
import { Link } from 'react-router-dom'
import CalisthenicsSection, { type BulkPrefill } from '../components/CalisthenicsSection'
import TodayStrengthCard from '../components/TodayStrengthCard'
import AISessionCard from '../components/AISessionCard'
import { useAICoach } from '../hooks/useAICoach'
import type { SessionExercise } from '../lib/calisthenicsSession'

export default function CalisthenicsPage() {
  const [prefill, setPrefill] = useState<BulkPrefill | null>(null)
  const aiCoach = useAICoach()

  function handleStartSession(exercises: SessionExercise[]) {
    setPrefill({
      exercises: exercises.map((ex) => ({
        id: ex.exerciseId,
        value: ex.targetValue,
        sets: ex.targetSets,
      })),
    })
  }

  function handleStartAISession() {
    if (!aiCoach.sessionPlan) return
    setPrefill({
      exercises: aiCoach.sessionPlan.map((item) => ({
        id: item.exerciseId,
        value: parseInt(item.reps) || 8,
        sets: item.sets,
      })),
    })
  }

  const hasAIPlan = aiCoach.sessionPlan && aiCoach.sessionPlan.length > 0

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

      {hasAIPlan ? (
        <div className="space-y-2">
          <AISessionCard plan={aiCoach.sessionPlan!} />
          <button
            onClick={handleStartAISession}
            className="w-full rounded-xl bg-purple-500/15 border border-purple-500/30 py-2.5 text-xs font-bold text-purple-400"
          >
            Start session
          </button>
        </div>
      ) : (
        <TodayStrengthCard onStartSession={handleStartSession} />
      )}

      <CalisthenicsSection prefill={prefill} onPrefillConsumed={() => setPrefill(null)} />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { EXERCISE_MUSCLES, MUSCLE_LABELS, type MuscleGroup } from '../data/muscleMap'
import { getExerciseDef } from '../data/calisthenics'
import { computeStreak } from '../lib/recommendation'
import { db } from '../db/db'
import type { CalisthenicsExerciseId } from '../db/db'
import ExerciseIcon from './ExerciseIcon'

export interface CelebrationData {
  exercises: { id: CalisthenicsExerciseId; value: number; sets: number }[]
  date: string
}

interface Props {
  data: CelebrationData
  onClose: () => void
}

export default function WorkoutCelebration({ data, onClose }: Props) {
  const [streak, setStreak] = useState(0)
  const [prs, setPrs] = useState<CalisthenicsExerciseId[]>([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
    computeStreak().then(setStreak)
    detectPRs(data).then(setPrs)

    const timer = setTimeout(() => handleClose(), 8000)
    return () => clearTimeout(timer)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const muscles = getUniqueMuscles(data.exercises.map((e) => e.id))
  const totalVolume = data.exercises.reduce((sum, e) => sum + e.value * (e.sets || 1), 0)
  const totalSets = data.exercises.reduce((sum, e) => sum + (e.sets || 1), 0)

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/70" />

      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="confetti-particle absolute"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              backgroundColor: ['#f5c842', '#a78bfa', '#2ec4b6', '#e8622a', '#f97316'][i % 5],
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className={`relative z-10 mx-4 w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl transition-transform duration-500 ${visible ? 'scale-100' : 'scale-90'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 text-center">
          <div className="mb-2 text-4xl animate-bounce">&#127881;</div>
          <h2 className="text-xl font-black text-ink">Session Complete!</h2>
          <p className="mt-1 text-xs text-muted">{data.exercises.length} exercise{data.exercises.length > 1 ? 's' : ''} logged</p>
        </div>

        {/* Stats row */}
        <div className="mb-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-purple/10 p-3">
            <div className="text-lg font-black text-purple">{totalSets}</div>
            <div className="text-[10px] font-semibold text-muted">Sets</div>
          </div>
          <div className="rounded-xl bg-accent/10 p-3">
            <div className="text-lg font-black text-accent">{totalVolume}</div>
            <div className="text-[10px] font-semibold text-muted">Total reps</div>
          </div>
          <div className="rounded-xl bg-gold/10 p-3">
            <div className="text-lg font-black text-gold">{streak}</div>
            <div className="text-[10px] font-semibold text-muted">Day streak</div>
          </div>
        </div>

        {/* PRs */}
        {prs.length > 0 && (
          <div className="mb-4 rounded-xl bg-gold/10 border border-gold/30 p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-sm">&#127942;</span>
              <span className="text-xs font-bold text-gold">NEW PERSONAL RECORD{prs.length > 1 ? 'S' : ''}!</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {prs.map((id) => {
                const def = getExerciseDef(id)
                return (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2.5 py-1 text-xs font-semibold text-ink">
                    <ExerciseIcon exerciseId={id} fallbackEmoji={def?.icon || ''} size="sm" />
                    {def?.name}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Muscles hit */}
        {muscles.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-bold text-muted uppercase tracking-wide">Muscles worked</h3>
            <div className="flex flex-wrap gap-1.5">
              {muscles.map((m) => (
                <span key={m} className="rounded-full bg-teal/10 border border-teal/30 px-2.5 py-1 text-xs font-medium text-teal">
                  {MUSCLE_LABELS[m]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={handleClose}
          className="mt-2 w-full rounded-full bg-purple/15 py-3 text-sm font-bold text-purple border border-purple/40"
        >
          Continue
        </button>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .confetti-particle {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          animation: confetti-fall 3s ease-in forwards;
        }
      `}</style>
    </div>
  )
}

function getUniqueMuscles(exerciseIds: CalisthenicsExerciseId[]): MuscleGroup[] {
  const set = new Set<MuscleGroup>()
  for (const id of exerciseIds) {
    const activations = EXERCISE_MUSCLES[id] ?? []
    for (const a of activations) {
      if (a.level === 'primary' || a.level === 'secondary') {
        set.add(a.muscle)
      }
    }
  }
  return Array.from(set)
}

async function detectPRs(data: CelebrationData): Promise<CalisthenicsExerciseId[]> {
  const prs: CalisthenicsExerciseId[] = []
  for (const entry of data.exercises) {
    const logs = await db.calisthenicsLogs
      .where('exerciseId')
      .equals(entry.id)
      .toArray()
    const previousBest = logs
      .filter((l) => l.date !== data.date || l.value !== entry.value)
      .reduce((max, l) => Math.max(max, l.value), 0)
    if (entry.value > previousBest && previousBest > 0) {
      prs.push(entry.id)
    }
  }
  return prs
}

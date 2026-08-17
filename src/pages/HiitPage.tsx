import { useState, useCallback, useEffect } from 'react'
import { Card, Tag } from '../components/Card'
import { PRESET_WORKOUTS, HIIT_FORMAT_INFO, generateBalancedHiit, type HiitWorkoutDef, type HiitFormat } from '../data/hiitWorkouts'
import { getExerciseDef } from '../data/calisthenics'
import { CHALLENGES, type ChallengeDef } from '../data/challenges'
import { db, type CalisthenicsExerciseId } from '../db/db'
import HiitTimer from '../components/HiitTimer'
import ChallengeTimer from '../components/ChallengeTimer'

type PageView = 'list' | 'hiit' | 'challenge'

export default function HiitPage() {
  const [activeWorkout, setActiveWorkout] = useState<HiitWorkoutDef | null>(null)
  const [activeChallenge, setActiveChallenge] = useState<ChallengeDef | null>(null)
  const [filterFormat, setFilterFormat] = useState<HiitFormat | 'all'>('all')
  const [generatedWorkout, setGeneratedWorkout] = useState<HiitWorkoutDef | null>(null)
  const [tab, setTab] = useState<'workouts' | 'challenges'>('workouts')
  const [challengeBests, setChallengeBests] = useState<Map<CalisthenicsExerciseId, number>>(new Map())

  useEffect(() => {
    db.calisthenicsLogs.toArray().then((logs) => {
      const bests = new Map<CalisthenicsExerciseId, number>()
      for (const log of logs) {
        if (!log.notes?.startsWith('Challenge:')) continue
        const prev = bests.get(log.exerciseId) ?? 0
        if (log.value > prev) bests.set(log.exerciseId, log.value)
      }
      setChallengeBests(bests)
    })
  }, [activeChallenge])

  const handleGenerate = useCallback(() => {
    setGeneratedWorkout(generateBalancedHiit(3))
  }, [])

  if (activeWorkout) {
    return <HiitTimer workout={activeWorkout} onClose={() => setActiveWorkout(null)} />
  }

  if (activeChallenge) {
    return (
      <ChallengeTimer
        challenge={activeChallenge}
        onClose={() => setActiveChallenge(null)}
        previousBest={challengeBests.get(activeChallenge.exerciseId) ?? null}
      />
    )
  }

  const filtered = filterFormat === 'all'
    ? PRESET_WORKOUTS
    : PRESET_WORKOUTS.filter((w) => w.format === filterFormat)

  return (
    <div className="space-y-4 pb-4 fade-in">
      <div>
        <p className="text-sm text-muted">Interval training</p>
        <h1 className="text-2xl font-extrabold">HIIT & Challenges</h1>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('workouts')}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
            tab === 'workouts'
              ? 'bg-orange/15 text-orange border border-orange/40'
              : 'bg-card text-muted border border-border'
          }`}
        >
          Workouts
        </button>
        <button
          onClick={() => setTab('challenges')}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
            tab === 'challenges'
              ? 'bg-purple/15 text-purple border border-purple/40'
              : 'bg-card text-muted border border-border'
          }`}
        >
          Challenges
        </button>
      </div>

      {tab === 'challenges' && (
        <ChallengesView
          challenges={CHALLENGES}
          bests={challengeBests}
          onSelect={setActiveChallenge}
        />
      )}

      {tab === 'workouts' && <>
      {/* Random Generator */}
      <Card>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink">Random Full Body</h3>
              <p className="text-[11px] text-muted">Push → Pull → Legs → Core, 40s/20s × 3 rounds</p>
            </div>
            <button
              onClick={handleGenerate}
              className="rounded-full bg-orange/15 px-3 py-1.5 text-xs font-bold text-orange border border-orange/30"
            >
              🎲 Generate
            </button>
          </div>

          {generatedWorkout && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {generatedWorkout.exercises.map((exId, i) => {
                  const def = getExerciseDef(exId)
                  const catColors = ['#e8622a', '#2ec4b6', '#f5c842', '#a78bfa']
                  return (
                    <span
                      key={`${exId}-${i}`}
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold border"
                      style={{
                        color: catColors[i],
                        background: catColors[i] + '15',
                        borderColor: catColors[i] + '30',
                      }}
                    >
                      {def?.name ?? exId}
                    </span>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveWorkout(generatedWorkout)}
                  className="flex-1 rounded-xl bg-orange py-2.5 text-xs font-bold text-white"
                >
                  Start Workout
                </button>
                <button
                  onClick={handleGenerate}
                  className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold text-muted"
                >
                  Reroll
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Format Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <FilterButton active={filterFormat === 'all'} onClick={() => setFilterFormat('all')}>
          All
        </FilterButton>
        {(Object.keys(HIIT_FORMAT_INFO) as HiitFormat[]).map((f) => (
          <FilterButton key={f} active={filterFormat === f} onClick={() => setFilterFormat(f)}>
            {HIIT_FORMAT_INFO[f].icon} {HIIT_FORMAT_INFO[f].label}
          </FilterButton>
        ))}
      </div>

      {/* Preset Workouts */}
      <div className="space-y-3">
        {filtered.map((w) => (
          <button
            key={w.id}
            onClick={() => setActiveWorkout(w)}
            className="w-full text-left"
          >
            <Card>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-ink">{w.name}</span>
                    <Tag color={formatColor(w.format)}>{HIIT_FORMAT_INFO[w.format].label}</Tag>
                  </div>
                  <p className="text-[11px] text-muted mb-2">{w.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {w.exercises.map((exId) => {
                      const def = getExerciseDef(exId)
                      return (
                        <span key={exId} className="rounded-full bg-card2 px-2 py-0.5 text-[10px] text-muted border border-border">
                          {def?.name ?? exId}
                        </span>
                      )
                    })}
                  </div>
                </div>
                <div className="flex-shrink-0 ml-3 text-right">
                  <div className="text-lg font-black text-ink">{formatDuration(w)}</div>
                  <div className="text-[10px] text-muted">{w.rounds} {w.format === 'amrap' ? 'min' : 'rounds'}</div>
                </div>
              </div>
            </Card>
          </button>
        ))}
      </div>
      </>}
    </div>
  )
}

function ChallengesView({
  challenges,
  bests,
  onSelect,
}: {
  challenges: ChallengeDef[]
  bests: Map<CalisthenicsExerciseId, number>
  onSelect: (c: ChallengeDef) => void
}) {
  const categories = ['push', 'pull', 'legs', 'core', 'full_body'] as const
  const categoryLabels: Record<string, string> = {
    push: '💪 Push',
    pull: '🧗 Pull',
    legs: '🦵 Legs',
    core: '🛡️ Core',
    full_body: '🔥 Full Body',
  }

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-xs text-muted">
          Density benchmarks — test work capacity, pacing, and mental grit. Do max 1× every 2–4 weeks when fully recovered.
        </p>
      </Card>

      {categories.map((cat) => {
        const catChallenges = challenges.filter((c) => c.category === cat)
        if (catChallenges.length === 0) return null
        return (
          <div key={cat}>
            <h3 className="mb-2 text-xs font-bold text-muted uppercase tracking-wider">
              {categoryLabels[cat]}
            </h3>
            <div className="space-y-2">
              {catChallenges.map((c) => {
                const best = bests.get(c.exerciseId)
                const exerciseDef = getExerciseDef(c.exerciseId)
                return (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c)}
                    className="w-full text-left"
                  >
                    <Card>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-bold text-ink">{c.icon} {c.name}</span>
                            <Tag color={c.type === 'max_reps' ? '#f5c842' : c.type === 'accumulate_hold' ? '#a78bfa' : '#2ec4b6'}>
                              {c.type === 'max_reps' ? 'Max' : c.type === 'accumulate_hold' ? 'Hold' : 'Target'}
                            </Tag>
                          </div>
                          <p className="text-[11px] text-muted truncate">{c.description}</p>
                          {best != null && best > 0 && (
                            <p className="text-[11px] font-semibold text-accent mt-0.5">
                              PR: {c.type === 'accumulate_hold' ? formatTimeMini(best) : `${best} reps`}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 ml-3 text-right">
                          <div className="text-base font-black text-ink">{formatTimeMini(c.timeLimitSec)}</div>
                          <div className="text-[10px] text-muted">time cap</div>
                        </div>
                      </div>
                    </Card>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatTimeMini(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (s === 0) return `${m}m`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
        active
          ? 'bg-orange/20 text-orange border border-orange/40'
          : 'bg-card text-muted border border-border'
      }`}
    >
      {children}
    </button>
  )
}

function formatColor(format: HiitFormat): string {
  switch (format) {
    case 'tabata': return '#e8622a'
    case 'emom': return '#2ec4b6'
    case 'amrap': return '#f5c842'
  }
}

function formatDuration(w: HiitWorkoutDef): string {
  if (w.format === 'amrap') {
    return `${Math.round(w.workSec / 60)}m`
  }
  const total = (w.workSec + w.restSec) * w.rounds
  return `${Math.round(total / 60)}m`
}

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ExerciseCard from '../components/ExerciseCard'
import ProgressionHeader from '../components/ProgressionHeader'
import { Card } from '../components/Card'
import BjjSkillsSection from '../components/BjjSkillsSection'
import { MORNING_ROUTINE, BJJ_RELEASE, PROGRESSIONS, PROGRESSION_LABELS } from '../data/exercises'
import { usePhaseProgress } from '../hooks/usePhaseProgress'
import { upsertTodaySession } from '../hooks/useSessions'
import { logHold } from '../hooks/useHoldLogs'
import { usePreferences } from '../hooks/usePreferences'
import type { ProgressionKey } from '../db/db'

type Tab = 'morning' | 'bjj_release' | ProgressionKey | 'calisthenics'

const TABS: { id: Tab; label: string }[] = [
  { id: 'morning', label: 'Morning' },
  { id: 'bjj_release', label: 'Post-BJJ' },
  { id: '90/90', label: '90/90' },
  { id: 'straddle', label: 'Straddle' },
  { id: 'pike', label: 'Pike' },
  { id: 'calisthenics', label: 'Calisthenics' }
]

export default function Mobility() {
  const [searchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab) || 'morning'
  const [tab, setTab] = useState<Tab>(initialTab)
  const { getPhase, setCheckpoint, advancePhase } = usePhaseProgress()
  const { preferences } = usePreferences()

  useEffect(() => {
    const t = searchParams.get('tab') as Tab
    if (t) setTab(t)
  }, [searchParams])

  return (
    <div className="space-y-4 pb-4 fade-in">
      <div>
        <p className="text-sm text-muted">Pelvis · Hips · Hamstrings</p>
        <h1 className="text-2xl font-extrabold">Mobility</h1>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id ? 'bg-teal/20 text-teal border border-teal/40' : 'bg-card text-muted border border-border'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'morning' && (
        <RoutineList
          key="morning"
          items={MORNING_ROUTINE}
          color="#2ec4b6"
          sessionLabel="Morning mobility"
          sessionType="morning"
          soundEnabled={preferences.soundEnabled}
        />
      )}
      {tab === 'bjj_release' && (
        <RoutineList
          key="bjj_release"
          items={BJJ_RELEASE}
          color="#e8622a"
          sessionLabel="Post-BJJ release"
          sessionType="bjj_release"
          soundEnabled={preferences.soundEnabled}
        />
      )}

      {(tab === '90/90' || tab === 'straddle' || tab === 'pike') && (
        <ProgressionView
          key={tab}
          exerciseKey={tab}
          getPhase={getPhase}
          setCheckpoint={setCheckpoint}
          advancePhase={advancePhase}
          soundEnabled={preferences.soundEnabled}
        />
      )}

      {tab === 'calisthenics' && <BjjSkillsSection />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// MORNING / POST-BJJ ROUTINES
// Only exercises that were actually marked complete count toward the
// session. The logged session reflects actual seconds spent vs the full
// planned duration, shown as a percentage if the routine wasn't finished.
// ─────────────────────────────────────────────────────────────────────────

function RoutineList({
  items,
  color,
  sessionLabel,
  sessionType,
  soundEnabled
}: {
  items: typeof MORNING_ROUTINE
  color: string
  sessionLabel: string
  sessionType: 'morning' | 'bjj_release'
  soundEnabled: boolean
}) {
  const [elapsed, setElapsed] = useState<Record<string, number>>({})

  const plannedSec = items.reduce((s, i) => s + i.timerSec, 0)
  const completedIds = Object.keys(elapsed)
  const actualSec = Object.values(elapsed).reduce((s, v) => s + v, 0)
  const percent = plannedSec > 0 ? Math.min(100, Math.round((actualSec / plannedSec) * 100)) : 0
  const allDone = completedIds.length === items.length

  async function handleComplete(id: string, elapsedSec: number) {
    const next = { ...elapsed, [id]: elapsedSec }
    setElapsed(next)

    const nextActual = Object.values(next).reduce((s, v) => s + v, 0)
    await upsertTodaySession({
      type: sessionType,
      label: sessionLabel,
      plannedSec,
      actualSec: nextActual,
      exerciseIds: Object.keys(next)
    })
  }

  return (
    <div>
      {items.map((ex, i) => (
        <ExerciseCard
          key={ex.id}
          index={i}
          name={ex.name}
          sets={ex.sets}
          setup={ex.setup}
          cue={ex.cue}
          feel={ex.feel}
          caution={ex.caution}
          timerSec={ex.timerSec}
          sides={ex.sides}
          color={color}
          completed={completedIds.includes(ex.id)}
          soundEnabled={soundEnabled}
          onComplete={(elapsedSec) => handleComplete(ex.id, elapsedSec)}
        />
      ))}

      {completedIds.length > 0 && (
        <Card
          className={`text-center text-sm font-bold ${
            allDone ? 'border-teal/40 bg-teal/10 text-teal' : 'border-gold/40 bg-gold/10 text-gold'
          }`}
        >
          {allDone ? '✓ Session logged — nice work' : `Session logged · ${percent}% of full routine`}
        </Card>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// PROGRESSIONS (90/90, Straddle, Pike)
// Completing before the timer ends records the actual hold time. The
// checkpoint/phase progression is then evaluated against the trend of
// actualSec over time (see Progress page).
// ─────────────────────────────────────────────────────────────────────────

function ProgressionView({
  exerciseKey,
  getPhase,
  setCheckpoint,
  advancePhase,
  soundEnabled
}: {
  exerciseKey: ProgressionKey
  getPhase: (k: ProgressionKey) => { phase: 1 | 2 | 3 | 4; checkpointMet: boolean } | undefined
  setCheckpoint: (k: ProgressionKey, met: boolean) => Promise<void>
  advancePhase: (k: ProgressionKey) => Promise<void>
  soundEnabled: boolean
}) {
  const progress = getPhase(exerciseKey)
  const phase = progress?.phase ?? 1
  const phaseDef = PROGRESSIONS[exerciseKey][phase - 1]
  const [done, setDone] = useState(false)
  const [lastActualSec, setLastActualSec] = useState<number | null>(null)

  async function handleComplete(elapsedSec: number) {
    setDone(true)
    setLastActualSec(elapsedSec)

    await logHold({
      exerciseKey,
      phase,
      plannedSec: phaseDef.timerSec,
      actualSec: elapsedSec
    })

    await upsertTodaySession({
      type: exerciseKey === '90/90' ? 'ninety_ninety' : exerciseKey === 'straddle' ? 'pancake' : 'pike',
      label: `${PROGRESSION_LABELS[exerciseKey]} · Phase ${phase}`,
      plannedSec: phaseDef.timerSec,
      actualSec: elapsedSec,
      exerciseIds: [`${exerciseKey}_p${phase}`]
    })
  }

  return (
    <div>
      <ProgressionHeader
        exerciseKey={exerciseKey}
        progress={progress as any}
        onCheckpointToggle={(met) => setCheckpoint(exerciseKey, met)}
        onAdvance={() => advancePhase(exerciseKey)}
      />
      <ExerciseCard
        index={0}
        name={`${PROGRESSION_LABELS[exerciseKey]} — ${phaseDef.label}`}
        sets={phaseDef.sets}
        setup={phaseDef.setup}
        cue={phaseDef.cue}
        feel={phaseDef.feel}
        checkpoint={phaseDef.checkpoint}
        timerSec={phaseDef.timerSec}
        sides={phaseDef.sides}
        color={phaseDef.color}
        completed={done}
        soundEnabled={soundEnabled}
        onComplete={handleComplete}
      />
      {done && lastActualSec != null && (
        <Card className="border-purple/40 bg-purple/10 text-center text-sm font-bold text-purple">
          Held {lastActualSec}s of {phaseDef.timerSec}s planned — logged to your progression trend
        </Card>
      )}
    </div>
  )
}

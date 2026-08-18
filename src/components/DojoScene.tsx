import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { PROGRESSION_CHAINS } from '../data/progressionChains'

type BjjBelt = 'white' | 'blue' | 'purple' | 'black'

interface DojoState {
  belt: BjjBelt
  bjjClasses: number
  totalHours: number
  todayXP: number
  mobilityHours: number
  calisthenicsUnlocks: string[]
}

const BELT_THRESHOLDS: { belt: BjjBelt; classes: number }[] = [
  { belt: 'black', classes: 200 },
  { belt: 'purple', classes: 100 },
  { belt: 'blue', classes: 50 },
  { belt: 'white', classes: 0 },
]

function getBelt(classes: number): BjjBelt {
  for (const t of BELT_THRESHOLDS) {
    if (classes >= t.classes) return t.belt
  }
  return 'white'
}

function getNextBeltThreshold(belt: BjjBelt): number | null {
  const idx = BELT_THRESHOLDS.findIndex((t) => t.belt === belt)
  return idx > 0 ? BELT_THRESHOLDS[idx - 1].classes : null
}

const BELT_SPRITE: Record<BjjBelt, string> = {
  white: '/sprites/avatar/judoka/south.png',
  blue: '/sprites/avatar/judoka/blue_belt/south.png',
  purple: '/sprites/avatar/judoka/purple_belt/south.png',
  black: '/sprites/avatar/judoka/black_belt/south.png',
}

const BELT_COLORS: Record<BjjBelt, string> = {
  white: '#f0f0f0',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  black: '#1a1a2e',
}

const AURA_LEVELS: { minHours: number; color: string; label: string }[] = [
  { minHours: 100, color: '#ef4444', label: 'Red' },
  { minHours: 50, color: '#3b82f6', label: 'Blue' },
  { minHours: 20, color: '#eab308', label: 'Yellow' },
  { minHours: 5, color: '#9ca3af', label: 'Grey' },
  { minHours: 0, color: 'transparent', label: '' },
]

function getAura(mobilityHours: number) {
  for (const a of AURA_LEVELS) {
    if (mobilityHours >= a.minHours) return a
  }
  return AURA_LEVELS[AURA_LEVELS.length - 1]
}

const EQUIPMENT_ICONS: { chainIds: string[]; label: string; emoji: string }[] = [
  { chainIds: ['pull_vertical', 'pull_levers'], label: 'Pull-up bar', emoji: '🏗️' },
  { chainIds: ['push_vertical'], label: 'Dip station', emoji: '⬛' },
  { chainIds: ['push_horizontal'], label: 'Parallettes', emoji: '🪵' },
  { chainIds: ['pull_horizontal'], label: 'Bands', emoji: '🟡' },
]

function useDojoState(): DojoState | null {
  return useLiveQuery(async () => {
    const [bjjLogs, sessions, calLogs] = await Promise.all([
      db.bjjClassLogs.toArray(),
      db.sessions.toArray(),
      db.calisthenicsLogs.toArray(),
    ])

    const bjjClasses = bjjLogs.length
    const belt = getBelt(bjjClasses)

    const totalSec = sessions.reduce((s, sess) => s + (sess.actualSec || sess.durationMin * 60), 0)
    const totalHours = Math.round(totalSec / 3600)

    const today = new Date().toISOString().split('T')[0]
    const todaySessions = sessions.filter((s) => s.date === today)
    const todayBjj = bjjLogs.filter((l) => l.date === today)
    const todayMins = todaySessions.reduce((s, sess) => s + sess.durationMin, 0)
      + todayBjj.reduce((s, l) => s + (l.technicalMins ?? 0) + (l.sparringMins ?? 0), 0)
    const todayXP = todayMins

    const mobSessions = sessions.filter((s) => s.type !== 'calisthenics' && s.type !== 'bjj' && s.type !== 'custom')
    const mobilityHours = Math.round(mobSessions.reduce((s, sess) => s + sess.durationMin, 0) / 60)

    // Determine unlocked equipment based on progression chain completion
    const calLogMap = new Map<string, number>()
    for (const log of calLogs) {
      const cur = calLogMap.get(log.exerciseId) ?? 0
      if (log.value > cur) calLogMap.set(log.exerciseId, log.value)
    }

    const unlockedChains: string[] = []
    for (const chain of PROGRESSION_CHAINS) {
      const hasLevel2 = chain.nodes.some((n) => {
        if (n.level < 2) return false
        return n.unlockRequirements.every((req) => {
          const best = calLogMap.get(req.exerciseId) ?? 0
          return best >= req.threshold
        })
      })
      if (hasLevel2) unlockedChains.push(chain.id)
    }

    return { belt, bjjClasses, totalHours, todayXP, mobilityHours, calisthenicsUnlocks: unlockedChains }
  }, [], null)
}

export default function DojoScene() {
  const state = useDojoState()

  if (!state) {
    return <div className="h-48 flex items-center justify-center text-muted text-sm">Loading...</div>
  }

  const { belt, bjjClasses, totalHours, todayXP, mobilityHours, calisthenicsUnlocks } = state
  const aura = getAura(mobilityHours)
  const nextThreshold = getNextBeltThreshold(belt)
  const beltProgress = nextThreshold ? Math.min(100, (bjjClasses / nextThreshold) * 100) : 100

  const visibleEquipment = EQUIPMENT_ICONS.filter((eq) =>
    eq.chainIds.some((id) => calisthenicsUnlocks.includes(id))
  )

  const dailyTarget = 60
  const dailyPct = Math.min(100, (todayXP / dailyTarget) * 100)

  return (
    <div className="space-y-3">
      {/* Dojo scene */}
      <div className="relative rounded-xl bg-card2 border border-border overflow-hidden" style={{ minHeight: 180 }}>
        {/* Aura glow behind character */}
        {aura.color !== 'transparent' && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: 0.3 }}
          >
            <div
              className="rounded-full blur-2xl"
              style={{
                width: 120,
                height: 120,
                background: `radial-gradient(circle, ${aura.color} 0%, transparent 70%)`,
              }}
            />
          </div>
        )}

        {/* Equipment on sides */}
        <div className="absolute left-3 bottom-3 flex flex-col gap-1.5">
          {visibleEquipment.slice(0, 2).map((eq) => (
            <div
              key={eq.label}
              className="w-7 h-7 rounded bg-card/80 border border-border/50 flex items-center justify-center text-sm"
              title={eq.label}
            >
              {eq.emoji}
            </div>
          ))}
        </div>
        <div className="absolute right-3 bottom-3 flex flex-col gap-1.5">
          {visibleEquipment.slice(2).map((eq) => (
            <div
              key={eq.label}
              className="w-7 h-7 rounded bg-card/80 border border-border/50 flex items-center justify-center text-sm"
              title={eq.label}
            >
              {eq.emoji}
            </div>
          ))}
        </div>

        {/* Character */}
        <div className="relative z-10 flex flex-col items-center pt-4 pb-3">
          <img
            src={BELT_SPRITE[belt]}
            alt={`${belt} belt judoka`}
            className="w-16 h-16"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="mt-2 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <div
                className="w-3 h-1.5 rounded-sm"
                style={{ backgroundColor: BELT_COLORS[belt], border: belt === 'white' ? '1px solid #ccc' : 'none' }}
              />
              <span className="text-sm font-bold text-ink">{belt} belt</span>
            </div>
            <div className="text-[11px] text-muted">{totalHours}h total training</div>
          </div>
        </div>
      </div>

      {/* Daily XP + Belt progress */}
      <div className="grid grid-cols-2 gap-2">
        {/* Today's XP */}
        <div className="rounded-lg bg-card border border-border p-3">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase text-muted tracking-wide">Today</span>
            <span className="text-sm font-bold text-ink">{todayXP} <span className="text-[10px] text-muted">min</span></span>
          </div>
          <div className="bg-border rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${dailyPct}%`,
                background: todayXP >= dailyTarget ? '#22c55e' : '#f59e0b',
              }}
            />
          </div>
          <div className="text-[10px] text-muted mt-1 text-right">
            {todayXP >= dailyTarget ? '✓ goal hit' : `${dailyTarget - todayXP}m to go`}
          </div>
        </div>

        {/* Belt progress */}
        <div className="rounded-lg bg-card border border-border p-3">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase text-muted tracking-wide">Belt</span>
            <span className="text-sm font-bold text-ink">{bjjClasses} <span className="text-[10px] text-muted">classes</span></span>
          </div>
          <div className="bg-border rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${beltProgress}%`,
                backgroundColor: BELT_COLORS[belt === 'black' ? 'black' : belt],
              }}
            />
          </div>
          <div className="text-[10px] text-muted mt-1 text-right">
            {nextThreshold ? `${nextThreshold - bjjClasses} to next` : 'max rank'}
          </div>
        </div>
      </div>

      {/* Discipline mini-stats */}
      <div className="flex gap-2">
        <DisciplinePill emoji="🥋" label="BJJ" value={`${bjjClasses} cls`} />
        <DisciplinePill emoji="💪" label="CAL" value={`${calisthenicsUnlocks.length}/${PROGRESSION_CHAINS.length} chains`} />
        <DisciplinePill
          emoji="🧘"
          label="MOB"
          value={aura.label || 'none'}
          color={aura.color !== 'transparent' ? aura.color : undefined}
        />
      </div>
    </div>
  )
}

function DisciplinePill({ emoji, label, value, color }: { emoji: string; label: string; value: string; color?: string }) {
  return (
    <div className="flex-1 rounded-lg bg-card border border-border px-2 py-1.5 text-center">
      <div className="text-sm">{emoji}</div>
      <div className="text-[9px] font-bold uppercase text-muted tracking-wide">{label}</div>
      <div className="text-[11px] font-semibold text-ink" style={color ? { color } : undefined}>{value}</div>
    </div>
  )
}

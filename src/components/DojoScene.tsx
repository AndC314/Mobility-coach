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

const AURA_LEVELS: { minHours: number; color: string; label: string; shadow: string }[] = [
  { minHours: 100, color: '#ef4444', label: 'Red', shadow: '0 0 40px 16px rgba(239,68,68,0.5)' },
  { minHours: 50, color: '#3b82f6', label: 'Blue', shadow: '0 0 40px 16px rgba(59,130,246,0.5)' },
  { minHours: 20, color: '#eab308', label: 'Yellow', shadow: '0 0 40px 16px rgba(234,179,8,0.4)' },
  { minHours: 5, color: '#9ca3af', label: 'Grey', shadow: '0 0 30px 12px rgba(156,163,175,0.3)' },
  { minHours: 0, color: 'transparent', label: '', shadow: 'none' },
]

function getAura(mobilityHours: number) {
  for (const a of AURA_LEVELS) {
    if (mobilityHours >= a.minHours) return a
  }
  return AURA_LEVELS[AURA_LEVELS.length - 1]
}

const EQUIPMENT: { chainIds: string[]; label: string; sprite: string; fallback: string }[] = [
  { chainIds: ['pull_vertical', 'pull_levers'], label: 'Pull-up bar', sprite: '/sprites/avatar/equipment/pullup_bar.png', fallback: '🏗️' },
  { chainIds: ['push_vertical'], label: 'Dip station', sprite: '/sprites/avatar/equipment/dip_station.png', fallback: '⬛' },
  { chainIds: ['push_horizontal'], label: 'Parallettes', sprite: '/sprites/avatar/equipment/parallettes.png', fallback: '🪵' },
  { chainIds: ['pull_horizontal'], label: 'Bands', sprite: '/sprites/avatar/equipment/bands.png', fallback: '🟡' },
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
    return <div className="h-56 flex items-center justify-center text-muted text-sm">Loading...</div>
  }

  const { belt, bjjClasses, totalHours, todayXP, mobilityHours, calisthenicsUnlocks } = state
  const aura = getAura(mobilityHours)
  const nextThreshold = getNextBeltThreshold(belt)
  const beltProgress = nextThreshold ? Math.min(100, (bjjClasses / nextThreshold) * 100) : 100

  const visibleEquipment = EQUIPMENT.filter((eq) =>
    eq.chainIds.some((id) => calisthenicsUnlocks.includes(id))
  )

  const dailyTarget = 60
  const dailyPct = Math.min(100, (todayXP / dailyTarget) * 100)

  return (
    <div className="space-y-3">
      {/* Dojo environment scene */}
      <div
        className="relative rounded-2xl overflow-hidden border border-border"
        style={{ height: 240 }}
      >
        {/* Dojo background */}
        <img
          src="/sprites/avatar/dojo_bg.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

        {/* Equipment placed in scene — left side */}
        <div className="absolute left-4 bottom-12 flex flex-col gap-2">
          {visibleEquipment.slice(0, 2).map((eq) => (
            <div
              key={eq.label}
              className="w-10 h-10 flex items-center justify-center"
              title={eq.label}
            >
              <span className="text-2xl drop-shadow-lg">{eq.fallback}</span>
            </div>
          ))}
        </div>

        {/* Equipment placed in scene — right side */}
        <div className="absolute right-4 bottom-12 flex flex-col gap-2">
          {visibleEquipment.slice(2).map((eq) => (
            <div
              key={eq.label}
              className="w-10 h-10 flex items-center justify-center"
              title={eq.label}
            >
              <span className="text-2xl drop-shadow-lg">{eq.fallback}</span>
            </div>
          ))}
        </div>

        {/* Aura behind character */}
        {aura.color !== 'transparent' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="rounded-full animate-pulse"
              style={{
                width: 100,
                height: 100,
                boxShadow: aura.shadow,
                background: `radial-gradient(circle, ${aura.color}33 0%, transparent 70%)`,
              }}
            />
          </div>
        )}

        {/* Judoka character — centered, large */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={BELT_SPRITE[belt]}
            alt={`${belt} belt judoka`}
            className="w-28 h-28 drop-shadow-lg"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Belt badge — bottom center overlay */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
          <div
            className="w-3 h-2 rounded-sm"
            style={{ backgroundColor: BELT_COLORS[belt], border: belt === 'white' ? '1px solid #888' : 'none' }}
          />
          <span className="text-xs font-bold text-white">{belt} belt</span>
          <span className="text-[10px] text-white/60">· {totalHours}h</span>
        </div>

        {/* Aura label — top right */}
        {aura.label && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: aura.color }} />
            <span className="text-[10px] font-semibold text-white">{aura.label} aura</span>
          </div>
        )}
      </div>

      {/* Stats row below scene */}
      <div className="grid grid-cols-2 gap-2">
        {/* Today's XP */}
        <div className="rounded-xl bg-card border border-border p-3">
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
        <div className="rounded-xl bg-card border border-border p-3">
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

      {/* Discipline pills */}
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

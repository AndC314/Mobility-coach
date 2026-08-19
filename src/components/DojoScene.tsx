import { useLiveQuery } from 'dexie-react-hooks'
import { useState, useEffect } from 'react'
import { db } from '../db/db'
import { PROGRESSION_CHAINS } from '../data/progressionChains'

type BjjBelt = 'white' | 'blue' | 'purple' | 'black'

interface DojoState {
  belt: BjjBelt
  bjjClasses: number
  totalHours: number
  todayXP: number
  mobilityHours: number
  calisthenicsHours: number
  bjjHours: number
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

// Dojo backgrounds progress with total training hours
const DOJO_LEVELS: { minHours: number; bg: string; label: string }[] = [
  { minHours: 100, bg: '/sprites/avatar/dojo_bg_3.png', label: 'Master Dojo' },
  { minHours: 40, bg: '/sprites/avatar/dojo_bg_2.png', label: 'Advanced Dojo' },
  { minHours: 0, bg: '/sprites/avatar/dojo_bg.png', label: 'Training Hall' },
]

function getDojo(totalHours: number) {
  for (const d of DOJO_LEVELS) {
    if (totalHours >= d.minHours) return d
  }
  return DOJO_LEVELS[DOJO_LEVELS.length - 1]
}

// Animation frames
const IDLE_FRAME = '/sprites/avatar/judoka/animations/walk/south/frame_00.png'
const JUMP_FRAMES = Array.from({ length: 13 }, (_, i) =>
  `/sprites/avatar/judoka/animations/jump/frame_${i.toString().padStart(2, '0')}.png`
)

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
    const bjjSec = bjjLogs.reduce((s, l) => s + ((l.technicalMins ?? 0) + (l.sparringMins ?? 0)) * 60, 0)
    const totalHours = Math.round((totalSec + bjjSec) / 3600)

    const today = new Date().toISOString().split('T')[0]
    const todaySessions = sessions.filter((s) => s.date === today)
    const todayBjj = bjjLogs.filter((l) => l.date === today)
    const todayMins = todaySessions.reduce((s, sess) => s + sess.durationMin, 0)
      + todayBjj.reduce((s, l) => s + (l.technicalMins ?? 0) + (l.sparringMins ?? 0), 0)

    const mobSessions = sessions.filter((s) => s.type !== 'calisthenics' && s.type !== 'bjj' && s.type !== 'custom')
    const mobilityHours = Math.round(mobSessions.reduce((s, sess) => s + sess.durationMin, 0) / 60 * 10) / 10

    const calSessions = sessions.filter((s) => s.type === 'calisthenics')
    const calisthenicsHours = Math.round(calSessions.reduce((s, sess) => s + sess.durationMin, 0) / 60 * 10) / 10

    const bjjHours = Math.round(bjjSec / 3600 * 10) / 10

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

    return { belt, bjjClasses, totalHours, todayXP: todayMins, mobilityHours, calisthenicsHours, bjjHours, calisthenicsUnlocks: unlockedChains }
  }, [], null)
}

export default function DojoScene() {
  const state = useDojoState()
  const [animFrame, setAnimFrame] = useState<string>(IDLE_FRAME)
  const [isJumping, setIsJumping] = useState(false)

  // Idle with periodic jump every 4-6 seconds
  useEffect(() => {
    let jumpTimeout: ReturnType<typeof setTimeout>
    let frameInterval: ReturnType<typeof setInterval>

    function scheduleJump() {
      const delay = 4000 + Math.floor(Math.random() * 2000)
      jumpTimeout = setTimeout(() => {
        setIsJumping(true)
        let f = 0
        frameInterval = setInterval(() => {
          setAnimFrame(JUMP_FRAMES[f])
          f++
          if (f >= JUMP_FRAMES.length) {
            clearInterval(frameInterval)
            setAnimFrame(IDLE_FRAME)
            setIsJumping(false)
            scheduleJump()
          }
        }, 100)
      }, delay)
    }

    scheduleJump()
    return () => { clearTimeout(jumpTimeout); clearInterval(frameInterval) }
  }, [])

  if (!state) {
    return <div className="h-56 flex items-center justify-center text-muted text-sm">Loading...</div>
  }

  const { belt, bjjClasses, totalHours, todayXP, mobilityHours, calisthenicsHours, bjjHours } = state
  const aura = getAura(mobilityHours)
  const nextThreshold = getNextBeltThreshold(belt)
  const dojo = getDojo(totalHours)

  const dailyTarget = 60
  const dailyPct = Math.min(100, (todayXP / dailyTarget) * 100)

  return (
    <div className="space-y-3">
      {/* Dojo environment scene */}
      <div
        className="relative rounded-2xl overflow-hidden border border-border"
        style={{ height: 240 }}
      >
        {/* Dojo background — progresses with total hours */}
        <img
          src={dojo.bg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

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

        {/* Judoka character — stationary with jump animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={animFrame}
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

      {/* Today's XP bar */}
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

      {/* Discipline level bars — 4 slots per level, each slot = 1h */}
      <div className="space-y-2">
        <LevelBar
          emoji="🥋"
          label="BJJ"
          hours={bjjHours}
          detail={`${bjjClasses} classes`}
          nextBeltInfo={nextThreshold ? `${nextThreshold - bjjClasses} to ${belt === 'white' ? 'blue' : belt === 'blue' ? 'purple' : 'black'}` : 'max'}
          color="#2ec4b6"
        />
        <LevelBar
          emoji="💪"
          label="Calisthenics"
          hours={calisthenicsHours}
          color="#e8622a"
        />
        <LevelBar
          emoji="🧘"
          label="Mobility"
          hours={mobilityHours}
          color="#a78bfa"
        />
      </div>
    </div>
  )
}

function LevelBar({ emoji, label, hours, detail, nextBeltInfo, color }: {
  emoji: string
  label: string
  hours: number
  detail?: string
  nextBeltInfo?: string
  color: string
}) {
  const hoursPerLevel = 4
  const level = Math.floor(hours / hoursPerLevel)
  const progressInLevel = hours - level * hoursPerLevel
  const slots = 4

  // Level tier colors
  const levelTier = Math.min(4, Math.floor(level / 3))
  const tierLabels = ['Beginner', 'Regular', 'Dedicated', 'Advanced', 'Elite']

  return (
    <div className="rounded-xl bg-card border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{emoji}</span>
          <div>
            <span className="text-xs font-bold text-ink">{label}</span>
            <span className="ml-1.5 text-[10px] text-muted">Lv.{level}</span>
            <span className="ml-1 text-[9px] text-muted">({tierLabels[levelTier]})</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-ink">{hours}h</span>
          {detail && <span className="ml-1.5 text-[10px] text-muted">{detail}</span>}
        </div>
      </div>

      {/* 4 slots bar */}
      <div className="flex gap-1">
        {Array.from({ length: slots }).map((_, i) => {
          const slotFilled = progressInLevel >= i + 1
          const slotPartial = !slotFilled && progressInLevel > i
          const partialPct = slotPartial ? ((progressInLevel - i) * 100) : 0

          return (
            <div
              key={i}
              className="flex-1 h-3 rounded-sm overflow-hidden"
              style={{ backgroundColor: `${color}20` }}
            >
              {slotFilled ? (
                <div className="h-full rounded-sm" style={{ backgroundColor: color }} />
              ) : slotPartial ? (
                <div
                  className="h-full rounded-sm transition-all"
                  style={{ width: `${partialPct}%`, backgroundColor: color, opacity: 0.7 }}
                />
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-muted">
          {Math.round((hoursPerLevel - progressInLevel) * 10) / 10}h to Lv.{level + 1}
        </span>
        {nextBeltInfo && (
          <span className="text-[9px] text-muted">{nextBeltInfo}</span>
        )}
      </div>
    </div>
  )
}

import { useRef, useState } from 'react'
import { Card } from '../components/Card'
import { usePreferences } from '../hooks/usePreferences'
import { useAuth } from '../hooks/useAuth'
import { downloadExport, importData, readFileAsJson, type ImportMode } from '../lib/dataTransfer'
import { runFullRepair, purgeGhostMobilitySessions } from '../lib/dataRepair'
import { primeAudio, playCompleteDing } from '../lib/sound'
import { db, type MobilityGoal, type SessionDuration, type SportDurationKey, type SportDurations, DEFAULT_SPORT_DURATIONS } from '../db/db'
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { db as firestoreDb } from '../lib/firebase'

const DURATIONS: SessionDuration[] = [10, 20, 30]
const GOALS: { id: MobilityGoal; label: string; icon: string }[] = [
  { id: 'bjj', label: 'BJJ', icon: '🥋' },
  { id: 'calisthenics', label: 'Calisthenics', icon: '🤸' },
  { id: 'general', label: 'General health', icon: '❤️' }
]

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-2.5 text-left"
      >
        <span className="text-xs font-semibold text-ink">{title}</span>
        <span className="text-muted text-xs">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="pb-3 space-y-1.5">{children}</div>}
    </div>
  )
}

function Formula({ label, formula }: { label: string; formula: string }) {
  return (
    <div className="rounded bg-card2 px-2.5 py-1.5">
      {label && <p className="text-[10px] text-muted mb-0.5">{label}</p>}
      <p className="text-[11px] font-mono text-ink/90">{formula}</p>
    </div>
  )
}

function MathRulesCard() {
  return (
    <Card>
      <h2 className="mb-1 text-base font-bold">Mathematical Rules</h2>
      <p className="text-[10px] text-muted mb-2">Formulas driving session recommendations and progress tracking</p>

      <CollapsibleSection title="Supercompensation (Banister Two-Factor)">
        <p className="text-[10px] text-muted leading-relaxed">
          Fitness and fatigue are modelled as two opposing exponential processes. After training,
          fatigue dominates briefly (dip), then fitness emerges above baseline (supercompensation).
        </p>
        <Formula label="Performance at time t" formula="P(t) = P0 + SUM[ k1*w_i*exp(-(t-t_i)/tau1) ] - SUM[ k2*w_i*exp(-(t-t_i)/tau2) ]" />
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          <div className="rounded bg-card2 px-2 py-1.5 text-center">
            <p className="text-[9px] text-muted">Strength</p>
            <p className="text-[10px] font-mono text-ink">tau1=21, tau2=3</p>
            <p className="text-[10px] font-mono text-ink">k1=1, k2=2.2</p>
          </div>
          <div className="rounded bg-card2 px-2 py-1.5 text-center">
            <p className="text-[9px] text-muted">Grappling</p>
            <p className="text-[10px] font-mono text-ink">tau1=25, tau2=4</p>
            <p className="text-[10px] font-mono text-ink">k1=1, k2=2</p>
          </div>
          <div className="rounded bg-card2 px-2 py-1.5 text-center">
            <p className="text-[9px] text-muted">Mobility</p>
            <p className="text-[10px] font-mono text-ink">tau1=30, tau2=1.5</p>
            <p className="text-[10px] font-mono text-ink">k1=1, k2=1.8</p>
          </div>
        </div>
        <p className="text-[10px] text-muted mt-2">
          tau1 = fitness decay (days), tau2 = fatigue decay (days), k1/k2 = gain multipliers, w_i = training impulse
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="Training Impulse">
        <p className="text-[10px] text-muted leading-relaxed">
          Each session generates an impulse that feeds into the supercompensation model.
          Impulse scales with intensity (volume relative to running best) and session density.
        </p>
        <Formula label="Impulse" formula="impulse = BASE_IMPULSE * intensity * density_factor" />
        <Formula label="Intensity" formula="intensity = session_volume / running_best_volume" />
        <Formula label="Density factor" formula="density = 1 + (exercises_count - 1) * 0.1" />
        <div className="rounded bg-card2 px-2.5 py-1.5 mt-1.5">
          <p className="text-[10px] text-muted">BASE_IMPULSE = 8</p>
          <p className="text-[10px] text-muted">Hard session threshold: intensity {'>='} 0.7</p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Atrophy Model">
        <p className="text-[10px] text-muted leading-relaxed">
          When no training occurs for a category, performance decays exponentially below baseline.
        </p>
        <Formula label="Decay after inactivity" formula="P(t) = baseline * exp(-ATROPHY_RATE * (days_inactive - THRESHOLD))" />
        <div className="rounded bg-card2 px-2.5 py-1.5 mt-1.5">
          <p className="text-[10px] text-muted">ATROPHY_THRESHOLD = 10 days (no decay before this)</p>
          <p className="text-[10px] text-muted">ATROPHY_RATE = 0.4</p>
          <p className="text-[10px] text-muted">ATROPHY_FLOOR = 70 (minimum score)</p>
          <p className="text-[10px] text-muted">Baseline = 100</p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Training Hours Consistency">
        <p className="text-[10px] text-muted leading-relaxed">
          Active training hours decay over time to reflect detraining. Only recent, consistently
          maintained hours count at full value.
        </p>
        <Formula label="Weekly decay" formula="active_hours = total_hours * (1 - 0.05 * weeks_inactive)" />
        <div className="rounded bg-card2 px-2.5 py-1.5 mt-1.5">
          <p className="text-[10px] text-muted">Decay rate: 5% per week of inactivity</p>
          <p className="text-[10px] text-muted">Floor: 0 hours (fully decayed)</p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Session Recommendation Logic">
        <p className="text-[10px] text-muted leading-relaxed">
          The rule-based engine picks exercises by combining supercompensation state, recency,
          and progression readiness.
        </p>
        <div className="space-y-1.5">
          <Formula label="Priority score" formula="priority = (100 - supercomp_score) + recency_bonus + plateau_penalty" />
          <Formula label="Recency bonus" formula="recency = min(days_since_last * 3, 30)" />
          <Formula label="Micro-progression" formula="upgrade 1 set at a time; max +10% weekly volume" />
        </div>
        <div className="rounded bg-card2 px-2.5 py-1.5 mt-1.5">
          <p className="text-[10px] text-muted">Deload: every 4th week (reduce volume 40-50%)</p>
          <p className="text-[10px] text-muted">Holds: progress by adding sets, not duration</p>
          <p className="text-[10px] text-muted">Pull-ups: cluster sets; Push-ups: EMOM density</p>
        </div>
      </CollapsibleSection>
    </Card>
  )
}

export default function Profile() {
  const { preferences, update } = usePreferences()
  const { user, logout } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [confirmingReplace, setConfirmingReplace] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [repairing, setRepairing] = useState(false)
  const [repairResult, setRepairResult] = useState<{ removed: number; fixed: number; purged: number; purgedLogs: number } | null>(null)
  const [syncDiag, setSyncDiag] = useState<{
    localSessions: number; localCal: number; localBjj: number
    remoteSessions: number; remoteCal: number; remoteBjj: number
    error?: string
  } | null>(null)
  const [diagLoading, setDiagLoading] = useState(false)
  const [pushResult, setPushResult] = useState<{ pushed: number; errors: string[] } | null>(null)
  const [pushing, setPushing] = useState(false)

  async function handleForcePush() {
    if (!user) return
    setPushing(true)
    setPushResult(null)
    const errors: string[] = []
    let pushed = 0

    try {
      // ── Step 0: Purge ghost mobility sessions from local first ─────────
      await purgeGhostMobilitySessions(user.uid)

      const calRef = collection(firestoreDb, `users/${user.uid}/calisthenicsLogs`)
      const bjjRef = collection(firestoreDb, `users/${user.uid}/bjjClassLogs`)
      const workoutsRef = collection(firestoreDb, `users/${user.uid}/workouts`)

      // ── Step 1: Delete ALL remote records ──────────────────────────────
      const [remoteCalSnap, remoteBjjSnap, remoteWorkoutsSnap] = await Promise.all([
        getDocs(calRef),
        getDocs(bjjRef),
        getDocs(workoutsRef),
      ])

      for (const d of remoteWorkoutsSnap.docs) {
        try {
          await deleteDoc(doc(firestoreDb, `users/${user.uid}/workouts`, d.id))
          pushed++
        } catch (err: any) {
          errors.push(`Del workout: ${err?.message || err}`)
          if (errors.length >= 3) break
        }
      }
      for (const d of remoteCalSnap.docs) {
        try {
          await deleteDoc(doc(firestoreDb, `users/${user.uid}/calisthenicsLogs`, d.id))
          pushed++
        } catch (err: any) {
          errors.push(`Del cal: ${err?.message || err}`)
          if (errors.length >= 3) break
        }
      }
      for (const d of remoteBjjSnap.docs) {
        try {
          await deleteDoc(doc(firestoreDb, `users/${user.uid}/bjjClassLogs`, d.id))
          pushed++
        } catch (err: any) {
          errors.push(`Del bjj: ${err?.message || err}`)
          if (errors.length >= 3) break
        }
      }

      // ── Step 2: Re-upload all local records ────────────────────────────
      const localSessions = await db.sessions.toArray()
      for (const s of localSessions) {
        try {
          const wDoc: Record<string, any> = {
            date: s.date,
            type: s.type,
            originalType: s.type,
            label: s.label || '',
            durationMin: s.durationMin,
            plannedSec: s.plannedSec,
            actualSec: s.actualSec,
            percent: s.percent,
            createdAt: s.createdAt || `${s.date}T00:00:00.000Z`,
          }
          if (s.exerciseIds) wDoc.exerciseIds = s.exerciseIds
          await addDoc(workoutsRef, wDoc)
          pushed++
        } catch (err: any) {
          errors.push(`Add workout ${s.date}: ${err?.message || err}`)
          if (errors.length >= 3) break
        }
      }

      const localCal = await db.calisthenicsLogs.toArray()
      for (const log of localCal) {
        try {
          const calDoc: Record<string, any> = {
            date: log.date,
            exerciseId: log.exerciseId,
            metric: log.metric || 'reps',
            value: log.value,
            createdAt: log.createdAt || `${log.date}T00:00:00.000Z`,
          }
          if (log.sets != null) calDoc.sets = log.sets
          if (log.notes != null) calDoc.notes = log.notes
          if (log.restSec != null) calDoc.restSec = log.restSec
          if (log.elapsedSec != null) calDoc.elapsedSec = log.elapsedSec
          await addDoc(calRef, calDoc)
          pushed++
        } catch (err: any) {
          errors.push(`Add cal ${log.exerciseId}: ${err?.message || err}`)
          if (errors.length >= 3) break
        }
      }

      const localBjj = await db.bjjClassLogs.toArray()
      for (const log of localBjj) {
        try {
          const bjjDoc: Record<string, any> = {
            date: log.date,
            tagIds: log.tagIds ?? [],
            createdAt: log.createdAt,
          }
          if (log.className != null) bjjDoc.className = log.className
          if (log.theme != null) bjjDoc.theme = log.theme
          if (log.technicalMins != null) bjjDoc.technicalMins = log.technicalMins
          if (log.sparringMins != null) bjjDoc.sparringMins = log.sparringMins
          if (log.notes != null) bjjDoc.notes = log.notes
          await addDoc(bjjRef, bjjDoc)
          pushed++
        } catch (err: any) {
          errors.push(`Add bjj ${log.date}: ${err?.message || err}`)
          if (errors.length >= 3) break
        }
      }
    } catch (err: any) {
      errors.push(`Top-level: ${err?.message || err}`)
    }

    setPushResult({ pushed, errors })
    setPushing(false)
  }

  async function handleSyncDiagnostic() {
    if (!user) return
    setDiagLoading(true)
    setSyncDiag(null)
    try {
      const [localSessions, localCal, localBjj] = await Promise.all([
        db.sessions.count(),
        db.calisthenicsLogs.count(),
        db.bjjClassLogs.count(),
      ])
      const [remoteSessionsSnap, remoteCalSnap, remoteBjjSnap] = await Promise.all([
        getDocs(collection(firestoreDb, `users/${user.uid}/workouts`)),
        getDocs(collection(firestoreDb, `users/${user.uid}/calisthenicsLogs`)),
        getDocs(collection(firestoreDb, `users/${user.uid}/bjjClassLogs`)),
      ])
      setSyncDiag({
        localSessions, localCal, localBjj,
        remoteSessions: remoteSessionsSnap.size,
        remoteCal: remoteCalSnap.size,
        remoteBjj: remoteBjjSnap.size,
      })
    } catch (err: any) {
      setSyncDiag({
        localSessions: 0, localCal: 0, localBjj: 0,
        remoteSessions: 0, remoteCal: 0, remoteBjj: 0,
        error: err?.message || 'Failed to read Firestore — check security rules',
      })
    } finally {
      setDiagLoading(false)
    }
  }

  async function handleRepair() {
    setRepairing(true)
    setRepairResult(null)
    try {
      const result = await runFullRepair(user?.uid)
      setRepairResult(result)
    } finally {
      setRepairing(false)
    }
  }


  async function handleExport() {
    setExporting(true)
    try {
      await downloadExport()
      setStatus({ type: 'success', message: 'Backup downloaded.' })
    } catch {
      setStatus({ type: 'error', message: 'Export failed — please try again.' })
    } finally {
      setExporting(false)
    }
  }

  function handlePickFile() {
    if (importMode === 'replace' && !confirmingReplace) {
      setConfirmingReplace(true)
      return
    }
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    setConfirmingReplace(false)
    if (!file) return

    try {
      const json = await readFileAsJson(file)
      const result = await importData(json, importMode)
      if (result.ok) {
        const total = Object.values(result.counts ?? {}).reduce((a, b) => a + b, 0)
        setStatus({ type: 'success', message: `Imported ${total} records. Reload the app to see everything.` })
      } else {
        setStatus({ type: 'error', message: result.error ?? 'Import failed.' })
      }
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Import failed.' })
    }
  }

  return (
    <div className="space-y-5 pb-4 fade-in">
      <div>
        <p className="text-sm text-muted">Settings</p>
        <h1 className="text-2xl font-extrabold">Profile</h1>
      </div>


      <Card>
        <h2 className="mb-3 text-base font-bold">Session duration per sport</h2>
        <p className="mb-3 text-xs text-muted">Target duration for each activity — affects how long recommended sessions are.</p>
        <div className="space-y-3">
          {([
            { key: 'mobility' as SportDurationKey, label: 'Mobility', icon: '🧘' },
            { key: 'calisthenics' as SportDurationKey, label: 'Calisthenics', icon: '💪' },
            { key: 'running' as SportDurationKey, label: 'Running', icon: '🏃' },
            { key: 'bjj' as SportDurationKey, label: 'BJJ', icon: '🥋' },
            { key: 'elite_forces' as SportDurationKey, label: 'Challenges', icon: '🔥' },
          ] as const).map((sport) => {
            const sportDurations = preferences.sportDurations ?? DEFAULT_SPORT_DURATIONS
            const current = sportDurations[sport.key] ?? 20
            return (
              <div key={sport.key} className="flex items-center gap-3">
                <span className="text-lg w-7">{sport.icon}</span>
                <span className="text-sm font-semibold flex-1">{sport.label}</span>
                <div className="flex gap-1">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        const next: SportDurations = { ...sportDurations, [sport.key]: d }
                        update({ sportDurations: next })
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                        current === d
                          ? 'bg-teal/20 text-teal border border-teal/40'
                          : 'bg-card2 text-muted border border-border'
                      }`}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-bold">AI Coach preferences</h2>
        <p className="mb-3 text-xs text-muted">Configure how the daily AI coaching adapts to your availability.</p>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-ink">Preferred session time</label>
            <div className="mt-2 flex gap-1.5">
              {([15, 30, 45, 60, 90] as const).map((min) => (
                <button
                  key={min}
                  onClick={() => update({ preferredSessionMin: min })}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
                    (preferences.preferredSessionMin ?? 45) === min
                      ? 'bg-accent/20 text-accent border border-accent/40'
                      : 'bg-card2 text-muted border border-border'
                  }`}
                >
                  {min}m
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-ink">Available equipment</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { id: 'pull_up_bar', label: 'Pull-up bar' },
                { id: 'parallel_bars', label: 'Parallel bars' },
                { id: 'parallettes', label: 'Parallettes' },
                { id: 'rings', label: 'Rings' },
                { id: 'resistance_bands', label: 'Bands' },
              ].map((eq) => {
                const active = (preferences.availableEquipment ?? []).includes(eq.id)
                return (
                  <button
                    key={eq.id}
                    onClick={() => {
                      const current = preferences.availableEquipment ?? []
                      const next = active
                        ? current.filter((e) => e !== eq.id)
                        : [...current, eq.id]
                      update({ availableEquipment: next })
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-teal/20 text-teal border border-teal/40'
                        : 'bg-card2 text-muted border border-border'
                    }`}
                  >
                    {eq.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-bold">Mobility goal</h2>
        <div className="space-y-2">
          {GOALS.map((g) => (
            <button
              key={g.id}
              onClick={() => update({ goal: g.id })}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                preferences.goal === g.id
                  ? 'bg-purple/20 text-purple border border-purple/40'
                  : 'bg-card2 text-ink/90 border border-border'
              }`}
            >
              <span className="text-xl">{g.icon}</span>
              <span className="text-sm font-semibold">{g.label}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">Dark mode</h2>
          <p className="text-xs text-muted">Default theme for Mobility Coach</p>
        </div>
        <button
          onClick={() => update({ darkMode: !preferences.darkMode })}
          className={`relative h-7 w-12 rounded-full transition-colors ${
            preferences.darkMode ? 'bg-teal/40' : 'bg-border'
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-card shadow transition-transform ${
              preferences.darkMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Timer sounds</h2>
            <p className="text-xs text-muted">Midway and end-of-timer dings — no need to watch the screen</p>
          </div>
          <button
            onClick={() => update({ soundEnabled: !preferences.soundEnabled })}
            className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${
              preferences.soundEnabled ? 'bg-teal/40' : 'bg-border'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-card shadow transition-transform ${
                preferences.soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {preferences.soundEnabled && (
          <button
            onClick={async () => { await primeAudio(); playCompleteDing() }}
            className="mt-3 w-full rounded-full bg-teal/10 py-2 text-xs font-bold text-teal border border-teal/30"
          >
            {'🔔'} Test sound
          </button>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-bold">Active sports</h2>
        <p className="mb-3 text-xs text-muted">Toggle which sports appear in your navigation. At least one must stay active.</p>
        <div className="flex flex-wrap gap-2">
          {([
            { id: 'mobility', label: 'Mobility', icon: '🧘' },
            { id: 'bjj', label: 'BJJ', icon: '🥋' },
            { id: 'calisthenics', label: 'Calisthenics', icon: '💪' },
            { id: 'running', label: 'Running', icon: '🏃' },
            { id: 'elite_forces', label: 'Challenges', icon: '🔥' },
          ] as const).map((sport) => {
            const activeSports = preferences.activeSports ?? ['mobility', 'bjj', 'calisthenics', 'running', 'elite_forces']
            const isActive = activeSports.includes(sport.id)
            const isLast = isActive && activeSports.length <= 1
            return (
              <button
                key={sport.id}
                disabled={isLast}
                onClick={() => {
                  const next = isActive
                    ? activeSports.filter((s) => s !== sport.id)
                    : [...activeSports, sport.id]
                  update({ activeSports: next })
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-teal/20 text-teal border border-teal/40'
                    : 'bg-card2 text-muted border border-border opacity-60'
                } ${isLast ? 'cursor-not-allowed' : ''}`}
              >
                {sport.icon} {sport.label}
              </button>
            )
          })}
        </div>
      </Card>


      <Card>
        <h2 className="mb-1 text-base font-bold">Your data</h2>
        <p className="mb-3 text-xs text-muted">
          Everything is stored only on this device. To move to a new phone or browser, export a backup
          here and import it there.
        </p>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="mb-3 w-full rounded-xl bg-teal/15 py-3 text-sm font-bold text-teal border border-teal/40 disabled:opacity-50"
        >
          {exporting ? 'Preparing…' : '⬇ Export backup'}
        </button>

        <div className="mb-2 flex gap-2">
          {(['merge', 'replace'] as ImportMode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setImportMode(m)
                setConfirmingReplace(false)
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold capitalize transition-colors ${
                importMode === m
                  ? 'bg-purple/15 text-purple border border-purple/40'
                  : 'bg-card2 text-muted border border-border'
              }`}
            >
              {m === 'merge' ? 'Merge' : 'Replace all'}
            </button>
          ))}
        </div>
        <p className="mb-3 text-[11px] text-muted">
          {importMode === 'merge'
            ? 'Adds records from the backup without touching what\u2019s already here.'
            : 'Clears everything on this device first, then loads the backup exactly as it was.'}
        </p>

        {confirmingReplace ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-accent">
              This will erase all current data on this device. Continue?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 rounded-xl bg-accent/15 py-2.5 text-sm font-bold text-accent border border-accent/40"
              >
                Yes, choose file
              </button>
              <button
                onClick={() => setConfirmingReplace(false)}
                className="flex-1 rounded-xl bg-card2 py-2.5 text-sm font-bold text-muted border border-border"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handlePickFile}
            className="w-full rounded-xl bg-card2 py-3 text-sm font-bold text-ink/90 border border-border"
          >
            ⬆ Import backup file…
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileSelected}
          className="hidden"
        />

        {status && (
          <div className="mt-3 space-y-2">
            <p className={`text-xs font-semibold ${status.type === 'success' ? 'text-teal' : 'text-accent'}`}>
              {status.message}
            </p>
            {status.type === 'success' && status.message.includes('Imported') && (
              <button
                onClick={() => window.location.reload()}
                className="w-full rounded-lg bg-teal/15 py-2 text-xs font-bold text-teal border border-teal/40"
              >
                Reload now
              </button>
            )}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 text-base font-bold">Fix data issues</h2>
        <p className="mb-3 text-xs text-muted">
          If you ever see duplicate sessions or odd values like "NaN min" in your logs (from an older
          version of the app), run this to clean it up. Safe to run any time — it only removes exact
          duplicate entries and corrects broken numbers, never your real progress.
        </p>
        <button
          onClick={handleRepair}
          disabled={repairing}
          className="w-full rounded-xl bg-card2 py-3 text-sm font-bold text-ink/90 border border-border disabled:opacity-50"
        >
          {repairing ? 'Checking…' : '🛠 Scan and fix'}
        </button>
        {repairResult && (
          <p className="mt-3 text-xs font-semibold text-teal">
            {repairResult.removed === 0 && repairResult.fixed === 0 && repairResult.purged === 0 && repairResult.purgedLogs === 0
              ? 'No issues found — your data looks clean.'
              : [
                  repairResult.fixed > 0 && `Fixed ${repairResult.fixed} record${repairResult.fixed === 1 ? '' : 's'}`,
                  repairResult.removed > 0 && `removed ${repairResult.removed} duplicate${repairResult.removed === 1 ? '' : 's'}`,
                  repairResult.purged > 0 && `purged ${repairResult.purged} ghost mobility session${repairResult.purged === 1 ? '' : 's'}`,
                  repairResult.purgedLogs > 0 && `deleted ${repairResult.purgedLogs} wrong exercise log${repairResult.purgedLogs === 1 ? '' : 's'}`,
                ].filter(Boolean).join(', ') + '.'}
          </p>
        )}
      </Card>

      {user && (
        <Card>
          <h2 className="mb-1 text-base font-bold">Sync diagnostic</h2>
          <p className="mb-3 text-xs text-muted">
            Compare local (this device) vs remote (Firestore) record counts to diagnose sync issues.
          </p>
          <button
            onClick={handleSyncDiagnostic}
            disabled={diagLoading}
            className="w-full rounded-xl bg-purple/15 py-3 text-sm font-bold text-purple border border-purple/40 disabled:opacity-50"
          >
            {diagLoading ? 'Checking…' : 'Run sync check'}
          </button>
          {syncDiag && (
            <div className="mt-3 space-y-2">
              {syncDiag.error ? (
                <p className="text-xs font-semibold text-accent">{syncDiag.error}</p>
              ) : (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="font-bold text-muted">Table</div>
                    <div className="font-bold text-muted">Local</div>
                    <div className="font-bold text-muted">Remote</div>
                  </div>
                  {[
                    { label: 'Sessions', local: syncDiag.localSessions, remote: syncDiag.remoteSessions },
                    { label: 'Calisthenics', local: syncDiag.localCal, remote: syncDiag.remoteCal },
                    { label: 'BJJ', local: syncDiag.localBjj, remote: syncDiag.remoteBjj },
                  ].map((row) => (
                    <div key={row.label} className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="text-left text-ink font-semibold">{row.label}</div>
                      <div className={row.local > 0 ? 'text-teal font-bold' : 'text-muted'}>{row.local}</div>
                      <div className={row.remote > 0 ? 'text-teal font-bold' : 'text-muted'}>{row.remote}</div>
                    </div>
                  ))}
                  {syncDiag.remoteCal === 0 && syncDiag.localCal === 0 && (
                    <p className="text-[11px] text-orange font-semibold mt-2">
                      Both empty — log in from the device where you trained to push data to Firestore.
                    </p>
                  )}
                  {syncDiag.remoteCal > 0 && syncDiag.localCal === 0 && (
                    <p className="text-[11px] text-orange font-semibold mt-2">
                      Remote has data but local is empty — onSnapshot listener may have failed. Try closing and reopening the app.
                    </p>
                  )}
                  {syncDiag.remoteCal === 0 && syncDiag.localCal > 0 && (
                    <p className="text-[11px] text-orange font-semibold mt-2">
                      Local has data but remote is empty — use Force Push below.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="mt-3 border-t border-border pt-3">
            <button
              onClick={handleForcePush}
              disabled={pushing}
              className="w-full rounded-xl bg-teal/15 py-3 text-sm font-bold text-teal border border-teal/40 disabled:opacity-50"
            >
              {pushing ? 'Syncing…' : 'Force sync local → Firestore (purge + reset)'}
            </button>
            {pushResult && (
              <div className="mt-2">
                {pushResult.pushed > 0 && (
                  <p className="text-xs font-semibold text-teal">
                    Done — {pushResult.pushed} operations (purged ghosts, wiped remote, re-uploaded local).
                  </p>
                )}
                {pushResult.errors.length > 0 && (
                  <div className="mt-1 space-y-1">
                    <p className="text-xs font-semibold text-accent">Errors ({pushResult.errors.length}):</p>
                    {pushResult.errors.map((e, i) => (
                      <p key={i} className="text-[10px] text-accent break-all">{e}</p>
                    ))}
                  </div>
                )}
                {pushResult.pushed === 0 && pushResult.errors.length === 0 && (
                  <p className="text-xs text-muted">Nothing new to push — all records already synced.</p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 text-base font-bold">Integrations</h2>
        <p className="text-xs leading-relaxed text-muted">
          Apple Health, Garmin, sleep, HRV, resting HR and training readiness sync are planned for a future
          companion app. The data model is already in place — no setup needed here yet.
        </p>
      </Card>

      <MathRulesCard />

      {user && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">Account</h2>
              <p className="text-xs text-muted">{user.email || 'Google account'}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-full bg-accent/10 px-4 py-2 text-xs font-bold text-accent border border-accent/30"
            >
              Sign out
            </button>
          </div>
        </Card>
      )}

      <p className="pt-2 text-center text-xs text-muted">Mobility Coach · v1.2a · All data stored locally on this device</p>
    </div>
  )
}

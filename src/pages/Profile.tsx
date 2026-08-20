import { useRef, useState } from 'react'
import { Card } from '../components/Card'
import { usePreferences } from '../hooks/usePreferences'
import { useAuth } from '../hooks/useAuth'
import { downloadExport, importData, readFileAsJson, type ImportMode } from '../lib/dataTransfer'
import { runFullRepair, purgeGhostMobilitySessions } from '../lib/dataRepair'
import { primeAudio, playCompleteDing } from '../lib/sound'
import { db, type MobilityGoal, type SessionDuration } from '../db/db'
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { db as firestoreDb } from '../lib/firebase'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DURATIONS: SessionDuration[] = [10, 20, 30]
const GOALS: { id: MobilityGoal; label: string; icon: string }[] = [
  { id: 'bjj', label: 'BJJ', icon: '🥋' },
  { id: 'calisthenics', label: 'Calisthenics', icon: '🤸' },
  { id: 'general', label: 'General health', icon: '❤️' }
]

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
  const [weightStr, setWeightStr] = useState('')
  const [weightSaved, setWeightSaved] = useState(false)

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

  function toggleDay(day: string) {
    const has = preferences.bjjDays.includes(day)
    const next = has ? preferences.bjjDays.filter((d) => d !== day) : [...preferences.bjjDays, day]
    update({ bjjDays: next })
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
        <h2 className="mb-3 text-base font-bold">BJJ days</h2>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => {
            const active = preferences.bjjDays.includes(day)
            return (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active ? 'bg-accent/20 text-accent border border-accent/40' : 'bg-card2 text-muted border border-border'
                }`}
              >
                {day}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-muted">Used to detect post-BJJ recovery days even without manual logging.</p>
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-bold">Session duration preference</h2>
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => update({ sessionDuration: d })}
              className={`flex-1 rounded-xl py-3 text-sm font-bold transition-colors ${
                preferences.sessionDuration === d
                  ? 'bg-teal/20 text-teal border border-teal/40'
                  : 'bg-card2 text-muted border border-border'
              }`}
            >
              {d} min
            </button>
          ))}
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
        <h2 className="mb-3 text-base font-bold">Body weight</h2>
        <p className="mb-3 text-xs text-muted">Used for future mechanical work calculations and progress tracking.</p>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            step="0.1"
            min="30"
            max="250"
            value={weightStr || (preferences.weightKg ?? '')}
            onChange={(e) => setWeightStr(e.target.value)}
            placeholder="kg"
            className="flex-1 rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink"
          />
          <span className="text-xs text-muted">kg</span>
          <button
            onClick={async () => {
              const kg = parseFloat(weightStr || String(preferences.weightKg ?? ''))
              if (!kg || kg < 30 || kg > 250) return
              await update({ weightKg: kg })
              await db.weightLogs.add({ date: new Date().toISOString().split('T')[0], weightKg: kg, createdAt: new Date().toISOString() })
              setWeightSaved(true)
              setTimeout(() => setWeightSaved(false), 2000)
            }}
            className="rounded-lg bg-teal/20 px-4 py-2 text-xs font-bold text-teal border border-teal/40"
          >
            {weightSaved ? '✓' : 'Save'}
          </button>
        </div>
        {preferences.weightKg != null && (
          <p className="mt-2 text-[11px] text-muted">Current: {preferences.weightKg} kg</p>
        )}
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

      <p className="pt-2 text-center text-xs text-muted">Mobility Coach · v1.0 · All data stored locally on this device</p>
    </div>
  )
}

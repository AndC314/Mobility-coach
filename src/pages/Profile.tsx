import { useRef, useState } from 'react'
import { Card } from '../components/Card'
import AvatarDisplay from '../components/AvatarDisplay'
import { usePreferences } from '../hooks/usePreferences'
import { useTrainingHours } from '../hooks/useTrainingHours'
import { getNudgeMessage } from '../lib/trainingHourCalculator'
import { downloadExport, importData, readFileAsJson, type ImportMode } from '../lib/dataTransfer'
import { runFullRepair } from '../lib/dataRepair'
import { primeAudio, playCompleteDing } from '../lib/sound'
import type { MobilityGoal, SessionDuration } from '../db/db'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DURATIONS: SessionDuration[] = [10, 20, 30]
const GOALS: { id: MobilityGoal; label: string; icon: string }[] = [
  { id: 'bjj', label: 'BJJ', icon: '🥋' },
  { id: 'calisthenics', label: 'Calisthenics', icon: '🤸' },
  { id: 'general', label: 'General health', icon: '❤️' }
]

export default function Profile() {
  const { preferences, update } = usePreferences()
  const trainingHours = useTrainingHours()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [confirmingReplace, setConfirmingReplace] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [repairing, setRepairing] = useState(false)
  const [repairResult, setRepairResult] = useState<{ removed: number; fixed: number } | null>(null)

  async function handleRepair() {
    setRepairing(true)
    setRepairResult(null)
    try {
      const result = await runFullRepair()
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
        <AvatarDisplay useSpriteAnimation={true} compact={true} />
      </Card>

      {trainingHours && trainingHours.length > 0 && (
        <Card>
          <h2 className="mb-4 text-base font-bold">Training consistency</h2>
          <div className="space-y-4">
            {trainingHours.map((training) => {
              const categoryEmoji = {
                bjj: '🥋',
                calisthenics: '💪',
                mobility: '🧘'
              }[training.category]

              const categoryName = {
                bjj: 'BJJ',
                calisthenics: 'Calisthenics',
                mobility: 'Mobility'
              }[training.category]

              // Compute total logged hours (before decay) and consistency ratio
              const decayRate = 0.05
              const weeksInactive = training.lastActivityDaysAgo / 7
              const totalLoggedHours = Math.round(training.totalHours / (1 - decayRate * weeksInactive) * 100) / 100
              const consistencyPercent = totalLoggedHours > 0 ? Math.round((training.totalHours / totalLoggedHours) * 100) : 0

              const progressPercent = Math.min(100, (training.totalHours / 40) * 100)
              const nudgeMsg = getNudgeMessage(training)

              return (
                <div key={training.category}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{categoryEmoji}</span>
                      <div>
                        <div className="text-sm font-semibold">{categoryName}</div>
                        <div className="text-xs text-muted">
                          {totalLoggedHours === 0 ? '0h logged' : `${training.totalHours}h • ${consistencyPercent}% consistent`}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted">{training.hoursThisWeek}h this week</div>
                  </div>
                  <div className="bg-border rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        training.needsNudge ? 'bg-orange-500' : 'bg-accent'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {nudgeMsg && (
                    <div className="text-xs text-orange-600 mt-2 italic">{nudgeMsg}</div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-xs text-muted">
            Skills decay 5% per week of inactivity. Log 1h/week to maintain your score.
          </p>
        </Card>
      )}

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
            {repairResult.removed === 0 && repairResult.fixed === 0
              ? 'No issues found — your data looks clean.'
              : `Fixed ${repairResult.fixed} record${repairResult.fixed === 1 ? '' : 's'} and removed ${repairResult.removed} duplicate${repairResult.removed === 1 ? '' : 's'}.`}
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 text-base font-bold">Integrations</h2>
        <p className="text-xs leading-relaxed text-muted">
          Apple Health, Garmin, sleep, HRV, resting HR and training readiness sync are planned for a future
          companion app. The data model is already in place — no setup needed here yet.
        </p>
      </Card>

      <p className="pt-2 text-center text-xs text-muted">Mobility Coach · v1.0 · All data stored locally on this device</p>
    </div>
  )
}

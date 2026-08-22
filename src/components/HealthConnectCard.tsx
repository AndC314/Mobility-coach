import { useState } from 'react'
import { Card } from './Card'
import { db, type HealthMetrics } from '../db/db'
import { syncHealthMetricsToFirebase, syncWeightLogToFirebase } from '../lib/sync'

type ImportStatus = 'idle' | 'importing' | 'success' | 'error'

interface HealthImportPayload {
  date: string
  sleepHours?: number
  hrv?: number
  restingHr?: number
  weight?: number
  vo2max?: number
  steps?: number
  source?: string
}

export default function HealthConnectCard() {
  const [showGuide, setShowGuide] = useState<'apple' | 'google' | null>(null)
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle')
  const [importCount, setImportCount] = useState(0)
  const [pasteValue, setPasteValue] = useState('')

  async function handleImport() {
    const text = pasteValue.trim()
    if (!text) return

    setImportStatus('importing')
    try {
      const data: HealthImportPayload | HealthImportPayload[] = JSON.parse(text)
      const entries = Array.isArray(data) ? data : [data]
      let count = 0

      for (const entry of entries) {
        if (!entry.date) continue

        const metrics: HealthMetrics = {
          date: entry.date,
          createdAt: new Date().toISOString(),
          source: 'apple_health',
        }
        if (entry.sleepHours != null && entry.sleepHours > 0) {
          metrics.sleepHours = entry.sleepHours
          metrics.sleepScore = Math.min(100, Math.round((entry.sleepHours / 8) * 100))
        }
        if (entry.hrv != null && entry.hrv > 0) metrics.hrv = entry.hrv
        if (entry.restingHr != null && entry.restingHr > 0) metrics.restingHr = entry.restingHr
        if (entry.vo2max != null && entry.vo2max > 0) metrics.vo2max = entry.vo2max

        const hasData = metrics.sleepHours || metrics.hrv || metrics.restingHr || metrics.vo2max
        if (hasData) {
          await db.healthMetrics.add(metrics)
          syncHealthMetricsToFirebase(metrics)
        }

        if (entry.weight != null && entry.weight > 0) {
          const weightLog = { date: entry.date, weightKg: entry.weight, createdAt: new Date().toISOString() }
          await db.weightLogs.add(weightLog)
          syncWeightLogToFirebase(weightLog)
        }

        if (hasData || (entry.weight != null && entry.weight > 0)) count++
      }

      setImportCount(count)
      setImportStatus('success')
      setPasteValue('')
      setTimeout(() => setImportStatus('idle'), 3000)
    } catch {
      setImportStatus('error')
      setTimeout(() => setImportStatus('idle'), 3000)
    }
  }

  return (
    <div className="space-y-4">
      {/* Quick Import */}
      <Card>
        <h3 className="text-sm font-bold mb-2">Quick Import</h3>
        <p className="text-xs text-muted mb-3">
          Paste health data as JSON from an iOS Shortcut or export tool.
        </p>
        <textarea
          value={pasteValue}
          onChange={(e) => setPasteValue(e.target.value)}
          placeholder={'{"date":"2026-08-22","sleepHours":7.5,"hrv":45,"restingHr":58,"weight":75.2}'}
          className="w-full rounded-lg bg-card2 border border-border px-3 py-2 text-xs text-ink placeholder:text-muted/40 font-mono resize-none"
          rows={3}
        />
        <button
          onClick={handleImport}
          disabled={importStatus === 'importing' || !pasteValue.trim()}
          className="mt-2 w-full rounded-xl bg-teal py-2.5 text-sm font-bold text-white disabled:opacity-40 transition-opacity"
        >
          {importStatus === 'importing' ? 'Importing...' :
           importStatus === 'success' ? `Imported ${importCount} entries` :
           importStatus === 'error' ? 'Invalid JSON format' :
           'Import Data'}
        </button>
      </Card>

      {/* Connection Options */}
      <Card>
        <h3 className="text-sm font-bold mb-3">Connect Health Data</h3>
        <div className="space-y-2">
          <button
            onClick={() => setShowGuide(showGuide === 'apple' ? null : 'apple')}
            className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors ${
              showGuide === 'apple' ? 'bg-accent/5 border-accent/30' : 'bg-card2 border-border'
            }`}
          >
            <span className="text-2xl">🍎</span>
            <div className="text-left flex-1">
              <span className="text-sm font-semibold text-ink block">Apple Health</span>
              <span className="text-[11px] text-muted">via iOS Shortcuts automation</span>
            </div>
            <span className="text-muted text-xs">{showGuide === 'apple' ? '▲' : '▼'}</span>
          </button>

          {showGuide === 'apple' && <AppleHealthGuide />}

          <button
            onClick={() => setShowGuide(showGuide === 'google' ? null : 'google')}
            className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors ${
              showGuide === 'google' ? 'bg-teal/5 border-teal/30' : 'bg-card2 border-border'
            }`}
          >
            <span className="text-2xl">💚</span>
            <div className="text-left flex-1">
              <span className="text-sm font-semibold text-ink block">Google Fit</span>
              <span className="text-[11px] text-muted">via Health Connect export</span>
            </div>
            <span className="text-muted text-xs">{showGuide === 'google' ? '▲' : '▼'}</span>
          </button>

          {showGuide === 'google' && <GoogleFitGuide />}
        </div>
      </Card>

      {/* Data Format Reference */}
      <Card>
        <h3 className="text-sm font-bold mb-2">JSON Format</h3>
        <p className="text-xs text-muted mb-2">
          Your shortcut or export tool should produce JSON in this format:
        </p>
        <pre className="rounded-lg bg-card2 border border-border p-3 text-[10px] text-muted font-mono overflow-x-auto">
{`{
  "date": "YYYY-MM-DD",
  "sleepHours": 7.5,
  "hrv": 45,
  "restingHr": 58,
  "weight": 75.2,
  "vo2max": 42.5
}`}
        </pre>
        <p className="mt-2 text-[10px] text-muted">
          All fields except <code className="text-accent">date</code> are optional. You can also pass an array of entries.
        </p>
      </Card>
    </div>
  )
}

function AppleHealthGuide() {
  return (
    <div className="rounded-xl bg-card2 border border-border p-4 space-y-3">
      <h4 className="text-xs font-bold text-accent uppercase tracking-wider">Setup Guide</h4>

      <div className="space-y-2.5">
        <Step n={1} title="Create an iOS Shortcut">
          Open the <strong>Shortcuts</strong> app and create a new shortcut.
        </Step>

        <Step n={2} title="Add Health actions">
          Add "Find Health Samples" actions for each metric:
          <ul className="mt-1 ml-3 space-y-0.5 text-[11px] text-muted list-disc">
            <li>Sleep Analysis → calculate total hours</li>
            <li>Heart Rate Variability → latest value</li>
            <li>Resting Heart Rate → latest value</li>
            <li>Body Mass → latest value in kg</li>
            <li>VO2 Max → latest value</li>
          </ul>
        </Step>

        <Step n={3} title="Format as JSON">
          Use a "Text" action to build the JSON object with today's date and your health values.
        </Step>

        <Step n={4} title="Copy to clipboard">
          Add "Copy to Clipboard" at the end. Then open this app and paste in the Quick Import above.
        </Step>

        <Step n={5} title="Automate (optional)">
          In Shortcuts → Automation, trigger this shortcut daily at wake-up time for hands-free data collection.
        </Step>
      </div>

      <div className="pt-2 border-t border-border">
        <p className="text-[10px] text-muted italic">
          Tip: Set the automation to run without confirmation so it copies data to clipboard automatically each morning.
        </p>
      </div>
    </div>
  )
}

function GoogleFitGuide() {
  return (
    <div className="rounded-xl bg-card2 border border-border p-4 space-y-3">
      <h4 className="text-xs font-bold text-teal uppercase tracking-wider">Setup Guide</h4>

      <div className="space-y-2.5">
        <Step n={1} title="Use Health Connect">
          Install <strong>Health Connect</strong> from Play Store if not already on your device.
        </Step>

        <Step n={2} title="Export via Tasker or MacroDroid">
          Use an automation app to read Health Connect data and format it as JSON.
        </Step>

        <Step n={3} title="Copy and paste">
          Copy the JSON output and paste it in the Quick Import section above.
        </Step>
      </div>

      <div className="pt-2 border-t border-border">
        <h5 className="text-[11px] font-semibold text-ink mb-1">Alternative: Google Takeout</h5>
        <p className="text-[10px] text-muted">
          Export from Google Takeout → Google Fit → download the JSON files → extract daily metrics → paste here.
        </p>
      </div>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center">
        <span className="text-[10px] font-bold text-accent">{n}</span>
      </div>
      <div className="flex-1">
        <span className="text-xs font-semibold text-ink">{title}</span>
        <p className="text-[11px] text-muted mt-0.5">{children}</p>
      </div>
    </div>
  )
}

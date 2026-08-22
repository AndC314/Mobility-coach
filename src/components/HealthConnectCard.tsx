import { useState } from 'react'
import { Card } from './Card'
import { importHealthJSON } from '../lib/healthImport'

type ImportStatus = 'idle' | 'importing' | 'success' | 'error'

export default function HealthConnectCard() {
  const [showGuide, setShowGuide] = useState<'apple' | 'google' | null>(null)
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle')
  const [importMsg, setImportMsg] = useState('')
  const [pasteValue, setPasteValue] = useState('')

  async function handleImport() {
    const text = pasteValue.trim()
    if (!text) return

    setImportStatus('importing')
    try {
      const count = await importHealthJSON(text)
      setImportMsg(`Imported ${count} entr${count === 1 ? 'y' : 'ies'}`)
      setImportStatus('success')
      setPasteValue('')
      setTimeout(() => setImportStatus('idle'), 3000)
    } catch (err: any) {
      setImportMsg(err?.message ?? 'Import failed')
      setImportStatus('error')
      setTimeout(() => setImportStatus('idle'), 4000)
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
           importStatus === 'success' ? importMsg :
           importStatus === 'error' ? importMsg :
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
  const appUrl = window.location.origin + window.location.pathname

  return (
    <div className="rounded-xl bg-card2 border border-border p-4 space-y-3">
      <h4 className="text-xs font-bold text-accent uppercase tracking-wider">Auto-Import via Shortcut</h4>
      <p className="text-[11px] text-muted">
        Create an iOS Shortcut that reads Apple Health and opens this app — data imports automatically, no paste needed.
      </p>

      <div className="space-y-2.5">
        <Step n={1} title="Create an iOS Shortcut">
          Open the <strong>Shortcuts</strong> app → tap + → name it "Sync Health".
        </Step>

        <Step n={2} title="Add Health actions">
          Add "Find Health Samples" for each metric you want:
          <ul className="mt-1 ml-3 space-y-0.5 text-[11px] text-muted list-disc">
            <li>Sleep Analysis → calculate total hours</li>
            <li>Heart Rate Variability → latest value</li>
            <li>Resting Heart Rate → latest value</li>
            <li>Body Mass → latest value in kg</li>
            <li>VO2 Max → latest value</li>
          </ul>
        </Step>

        <Step n={3} title="Build JSON + Base64 encode">
          Use a "Text" action with the JSON template, then "Base64 Encode" it.
        </Step>

        <Step n={4} title='Open URL with data'>
          Add "Open URLs" action with:
          <code className="mt-1 block text-[10px] bg-card p-2 rounded border border-border break-all">
            {appUrl}?health=[Base64 result]
          </code>
        </Step>

        <Step n={5} title="Automate daily">
          Shortcuts → Automation → Time of Day → run "Sync Health" at wake-up. Enable "Run without asking".
        </Step>
      </div>

      <div className="pt-2 border-t border-border space-y-1.5">
        <p className="text-[10px] text-muted italic">
          The app detects the URL parameter, imports data instantly, and cleans the URL. Zero taps after setup.
        </p>
        <p className="text-[10px] text-muted">
          Fallback: you can still paste JSON manually in the Quick Import above.
        </p>
      </div>
    </div>
  )
}

function GoogleFitGuide() {
  const appUrl = window.location.origin + window.location.pathname

  return (
    <div className="rounded-xl bg-card2 border border-border p-4 space-y-3">
      <h4 className="text-xs font-bold text-teal uppercase tracking-wider">Auto-Import via Tasker</h4>

      <div className="space-y-2.5">
        <Step n={1} title="Install Health Connect">
          Get <strong>Health Connect</strong> from Play Store and grant permissions to Google Fit.
        </Step>

        <Step n={2} title="Create Tasker profile">
          Use <strong>Tasker</strong> or <strong>MacroDroid</strong> to read Health Connect APIs (sleep, HR, weight).
        </Step>

        <Step n={3} title="Format + Base64 encode">
          Build a JSON string with the data, then Base64 encode it.
        </Step>

        <Step n={4} title="Open browser with URL">
          Launch browser with:
          <code className="mt-1 block text-[10px] bg-card p-2 rounded border border-border break-all">
            {appUrl}?health=[base64 encoded JSON]
          </code>
        </Step>

        <Step n={5} title="Schedule daily">
          Set the Tasker profile to trigger daily (e.g., 7am). The app imports automatically on open.
        </Step>
      </div>

      <div className="pt-2 border-t border-border">
        <h5 className="text-[11px] font-semibold text-ink mb-1">Alternative: Google Takeout</h5>
        <p className="text-[10px] text-muted">
          Google Takeout → Google Fit → download JSON → base64 encode → open URL. Or paste JSON manually above.
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

import { db } from '../db/db'

const EXPORT_VERSION = 1

/** Tables included in export/import, in a safe dependency order for import
 * (independent tables first; bjjClassLogs references bjjSkillTags by id,
 * but since we preserve original ids on import, order doesn't strictly
 * matter — listed explicitly here for clarity and future-proofing). */
const TABLE_NAMES = [
  'sessions',
  'phaseProgress',
  'measurements',
  'sorenessLogs',
  'bjjLogs',
  'preferences',
  'healthMetrics',
  'bjjSkillTags',
  'bjjClassLogs',
  'holdLogs',
  'calisthenicsLogs'
] as const

export interface ExportBundle {
  appName: 'mobility-coach'
  exportVersion: number
  exportedAt: string
  tables: Record<string, unknown[]>
}

/** Dumps every table to a single JSON-serializable object. */
export async function exportAllData(): Promise<ExportBundle> {
  const tables: Record<string, unknown[]> = {}
  for (const name of TABLE_NAMES) {
    tables[name] = await (db as any)[name].toArray()
  }
  return {
    appName: 'mobility-coach',
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    tables
  }
}

/** Triggers a browser download of the export bundle as a JSON file. */
export async function downloadExport() {
  const bundle = await exportAllData()
  const json = JSON.stringify(bundle, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = bundle.exportedAt.slice(0, 10)
  a.href = url
  a.download = `mobility-coach-backup-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export type ImportMode = 'replace' | 'merge'

export interface ImportResult {
  ok: boolean
  error?: string
  counts?: Record<string, number>
}

/**
 * Imports a previously exported bundle.
 *  - 'replace': clears each known table, then bulk-adds the imported rows
 *    (preserving original ids where possible).
 *  - 'merge': adds imported rows without clearing existing data first.
 *    Rows with colliding primary keys are skipped to avoid overwriting
 *    anything already on this device.
 */
export async function importData(bundle: unknown, mode: ImportMode = 'replace'): Promise<ImportResult> {
  if (
    typeof bundle !== 'object' ||
    bundle === null ||
    (bundle as any).appName !== 'mobility-coach' ||
    typeof (bundle as any).tables !== 'object'
  ) {
    return { ok: false, error: 'This file doesn\u2019t look like a Mobility Coach backup.' }
  }

  const tables = (bundle as ExportBundle).tables
  const counts: Record<string, number> = {}

  try {
    await db.transaction('rw', TABLE_NAMES.map((n) => (db as any)[n]), async () => {
      for (const name of TABLE_NAMES) {
        const rows = tables[name]
        if (!Array.isArray(rows)) continue

        const table = (db as any)[name]

        if (mode === 'replace') {
          await table.clear()
          if (rows.length > 0) {
            await table.bulkPut(rows)
          }
        } else {
          // merge: skip rows whose id already exists
          const existingIds = new Set((await table.toCollection().primaryKeys()) as number[])
          const toAdd = rows.filter((r: any) => r.id == null || !existingIds.has(r.id))
          if (toAdd.length > 0) {
            await table.bulkAdd(toAdd)
          }
        }
        counts[name] = rows.length
      }
    })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Import failed.' }
  }

  return { ok: true, counts }
}

/** Reads a File (from an <input type="file">) and parses it as JSON. */
export function readFileAsJson(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string))
      } catch {
        reject(new Error('Could not parse this file as JSON.'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read this file.'))
    reader.readAsText(file)
  })
}

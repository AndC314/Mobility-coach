import { db, HoldLog, ProgressionKey } from '../db/db'

/**
 * Automatically detect if a progression checkpoint has been met based on HoldLog data.
 * Returns true if the latest holds meet the phase threshold.
 */
export async function isCheckpointMet(
  exerciseKey: ProgressionKey,
  phase: 1 | 2 | 3 | 4
): Promise<boolean> {
  const holds = await db.holdLogs
    .where('exerciseKey')
    .equals(exerciseKey)
    .filter((h) => h.phase === phase)
    .toArray()

  if (holds.length === 0) return false

  // Sort by date descending, take last 3 sessions
  const recent = holds.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3)
  const avgActualSec = recent.reduce((sum, h) => sum + h.actualSec, 0) / recent.length

  // Phase-specific thresholds (extracted from checkpoint descriptions)
  const thresholds: Record<ProgressionKey, Record<1 | 2 | 3 | 4, number>> = {
    '90/90': {
      1: 45, // Phase 1: Both hips on floor, 60s target → 45s consistent = good
      2: 45, // Phase 2: Upright no hands, 45s per side
      3: 10, // Phase 3: 10 switches + 5 hip lifts (proxy: 10s per cycle ≈ 3 min total, but measure quality not just time)
      4: 30, // Phase 4: Fluid 5-cycle sequence (proxy: 30s for full flow)
    },
    straddle: {
      1: 45, // Phase 1: Feel adductors, 60s hold → 45s consistent
      2: 45, // Phase 2: Hands 10–15cm in front → measure indirectly (60s hold is success)
      3: 60, // Phase 3: Forearms approaching floor, 90s loaded hold
      4: 150, // Phase 4: 2–3 min loaded holds
    },
    pike: {
      1: 45, // Phase 1: Feel hamstrings, 60s hold → 45s consistent
      2: 10, // Phase 2: 10 clean active pulses (count in reps proxy — if 3 sets of 10 then 30s total)
      3: 10, // Phase 3: Tuck hold 10s on parallettes
      4: 3, // Phase 4: L-sit hold 3s on parallettes
    },
  }

  const threshold = thresholds[exerciseKey][phase]
  return avgActualSec >= threshold * 0.9 // Allow 10% margin for form variation
}

/**
 * Batch-check all progressions and return which ones have met checkpoints.
 * Called by usePhaseProgress to offer auto-advance suggestions.
 */
export async function detectUnmetCheckpoints(): Promise<
  Array<{ exerciseKey: ProgressionKey; phase: 1 | 2 | 3 | 4; shouldAdvance: boolean }>
> {
  const results: Array<{ exerciseKey: ProgressionKey; phase: 1 | 2 | 3 | 4; shouldAdvance: boolean }> = []

  for (const exerciseKey of ['90/90', 'straddle', 'pike'] as const) {
    for (const phase of [1, 2, 3, 4] as const) {
      const met = await isCheckpointMet(exerciseKey, phase)
      results.push({ exerciseKey, phase, shouldAdvance: met && phase < 4 })
    }
  }

  return results
}

import { WorkoutDoc } from '../types/firebase'

export interface WorkoutConflictResolverProps {
  isOpen: boolean
  conflicts: WorkoutDoc[]
  onResolve: (kept: WorkoutDoc, deleted: WorkoutDoc) => void
  onCancel: () => void
}

function formatWorkoutPreview(workout: WorkoutDoc): string {
  const parts: string[] = []

  // Type
  parts.push(workout.type.charAt(0).toUpperCase() + workout.type.slice(1))

  // Calisthenics-specific info
  if (workout.type === 'calisthenics' && workout.actualSec !== undefined) {
    parts.push(`${Math.round(workout.actualSec / 60)}m`)
  }

  // BJJ-specific info
  if (workout.type === 'bjj' && workout.tags && workout.tags.length > 0) {
    parts.push(`${workout.tags.length} tags`)
  }

  // Mobility-specific info
  if (workout.type === 'mobility' && workout.area) {
    parts.push(workout.area.replace('_', ' '))
  }

  // Exercise count
  if (workout.exerciseIds.length > 0) {
    parts.push(`${workout.exerciseIds.length} exercises`)
  }

  // Created time
  const createdDate = new Date(workout.createdAt)
  const time = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  parts.push(`at ${time}`)

  return parts.join(' • ')
}

export function WorkoutConflictResolver({
  isOpen,
  conflicts,
  onResolve,
  onCancel,
}: WorkoutConflictResolverProps) {
  if (!isOpen || conflicts.length < 2) return null

  const w1 = conflicts[0]
  const w2 = conflicts[1]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-lg p-6 space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-ink">Resolve Conflict</h2>
          <p className="text-sm text-muted">
            Multiple workouts found on {w1.date}. Choose which one to keep.
          </p>
        </div>

        {/* Workout Options */}
        <div className="space-y-3">
          {/* First Workout Option */}
          <button
            onClick={() => onResolve(w1, w2)}
            className="w-full text-left rounded-lg border border-border bg-card2 p-4 hover:bg-surface transition-colors"
          >
            <p className="text-sm text-muted mb-2">Option 1</p>
            <p className="text-sm font-medium text-ink mb-3">
              {formatWorkoutPreview(w1)}
            </p>
            <div className="flex items-center gap-2 text-sm text-teal font-semibold">
              ✓ Keep this one
            </div>
          </button>

          {/* Divider */}
          <div className="text-center text-xs text-muted">OR</div>

          {/* Second Workout Option */}
          <button
            onClick={() => onResolve(w2, w1)}
            className="w-full text-left rounded-lg border border-border bg-card2 p-4 hover:bg-surface transition-colors"
          >
            <p className="text-sm text-muted mb-2">Option 2</p>
            <p className="text-sm font-medium text-ink mb-3">
              {formatWorkoutPreview(w2)}
            </p>
            <div className="flex items-center gap-2 text-sm text-teal font-semibold">
              ✓ Keep this one
            </div>
          </button>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="w-full rounded-lg border border-border bg-card2 py-3 px-4 text-sm font-medium text-ink hover:bg-surface transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

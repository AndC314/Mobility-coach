export interface ConflictWarningProps {
  conflictDays: string[]
}

export function ConflictWarning({ conflictDays }: ConflictWarningProps) {
  if (conflictDays.length === 0) return null

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
      <p className="text-sm font-semibold text-yellow-800">
        ⚠️ {conflictDays.length} day(s) have conflicting workouts
      </p>
      <p className="text-xs text-yellow-700 mt-1">
        Tap a day to review and resolve conflicts
      </p>
    </div>
  )
}

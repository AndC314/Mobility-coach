import { useState } from 'react'
import { db, customExerciseId } from '../db/db'
import { useAuth } from '../hooks/useAuth'
import type { CustomExercise } from '../db/db'

interface CustomExerciseFormProps {
  type: 'calisthenics' | 'mobility'
  onSave?: () => void
  onCancel?: () => void
}

const MUSCLES = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'obliques', 'hip flexors']
const BODY_AREAS = ['hip', 'spine', 'shoulder', 'full_body']

export default function CustomExerciseForm({
  type,
  onSave,
  onCancel
}: CustomExerciseFormProps) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('💪')
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([])
  const [bodyArea, setBodyArea] = useState('hip')
  const [isGlobal, setIsGlobal] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleMuscleToggle = (muscle: string) => {
    setSelectedMuscles((prev) =>
      prev.includes(muscle)
        ? prev.filter((m) => m !== muscle)
        : [...prev, muscle]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !name.trim()) {
      setError('Name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const exercise: CustomExercise = {
        id: customExerciseId(`${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
        userId: user.uid,
        name: name.trim(),
        type: 'dynamic',
        icon,
        exerciseType: type,
        primaryMuscles: type === 'calisthenics' ? selectedMuscles : undefined,
        bodyArea: type === 'mobility' ? bodyArea : undefined,
        isGlobal,
        createdAt: new Date().toISOString()
      }

      await db.customExercises.add(exercise)

      setName('')
      setIcon('💪')
      setSelectedMuscles([])
      setBodyArea('hip')
      onSave?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save exercise')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-lg bg-card border border-border">
      <h3 className="font-bold text-ink">
        Create Custom {type === 'calisthenics' ? 'Calisthenics' : 'Mobility'} Exercise
      </h3>

      {error && (
        <div className="text-sm text-accent bg-accent/10 p-3 rounded border border-accent/30">
          {error}
        </div>
      )}

      {/* Name input */}
      <div>
        <label className="text-sm font-semibold text-muted block mb-1">Exercise Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Assault Bike Sprints"
          className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink placeholder:text-muted"
        />
      </div>

      {/* Icon input */}
      <div>
        <label className="text-sm font-semibold text-muted block mb-1">Icon Emoji</label>
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value.slice(-1))}
          maxLength={2}
          placeholder="💪"
          className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink text-2xl text-center"
        />
      </div>

      {/* Calisthenics: Muscle Groups */}
      {type === 'calisthenics' && (
        <div>
          <label className="text-sm font-semibold text-muted block mb-2">Primary Muscles</label>
          <div className="space-y-2">
            {MUSCLES.map((muscle) => (
              <label key={muscle} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMuscles.includes(muscle)}
                  onChange={() => handleMuscleToggle(muscle)}
                  className="rounded border border-border"
                />
                <span className="text-sm text-ink">{muscle}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Mobility: Body Area */}
      {type === 'mobility' && (
        <div>
          <label className="text-sm font-semibold text-muted block mb-1">Body Area</label>
          <select
            value={bodyArea}
            onChange={(e) => setBodyArea(e.target.value)}
            className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink"
          >
            {BODY_AREAS.map((area) => (
              <option key={area} value={area}>
                {area.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Global toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isGlobal}
          onChange={(e) => setIsGlobal(e.target.checked)}
          className="rounded border border-border"
        />
        <span className="text-sm text-ink">Save to global library</span>
      </label>

      {/* Submit buttons */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-full bg-accent/20 py-2.5 text-sm font-bold text-accent border border-accent/40 hover:bg-accent/30 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : 'Save Exercise'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full bg-border/50 py-2.5 text-sm font-bold text-ink border border-border hover:bg-border/70 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

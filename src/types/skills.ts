export interface SkillPrerequisite {
  exerciseId: string
  metric: 'reps' | 'sec'
  threshold: number
  label: string
}

export interface SkillTier {
  tier: number
  name: string
  targetTUTorReps: string
  exerciseId: string
}

export interface SkillNode {
  id: string
  name: string
  category: 'pull' | 'push' | 'core' | 'legs' | 'dynamic'
  prerequisites: SkillPrerequisite[]
  tiers: SkillTier[]
}

import { db, type CompletedSession } from '../db/db'
import { todayIso } from './date'

export type TrainingCategory = 'bjj' | 'calisthenics' | 'mobility'

export interface TrainingHours {
  category: TrainingCategory
  totalHours: number // with 5%/week decay applied
  lastActivityDaysAgo: number
  hoursThisWeek: number
  needsNudge: boolean // true if < 1 hour in past 7 days
}

/**
 * Map session types to training categories
 */
function getCategory(sessionType: string): TrainingCategory | null {
  if (sessionType === 'calisthenics') return 'calisthenics'
  if (['morning', 'bjj_release', 'recovery', 'hip_mobility', 'pancake', 'pike', 'ninety_ninety', 'custom'].includes(sessionType)) {
    return 'mobility'
  }
  return null
}

/**
 * Calculate total hours logged for a category, with 5%/week decay for inactivity
 * Formula: hours × (1 - 0.05 × weeksInactive)
 * After 2 weeks: 90%
 * After 4 weeks: 80%
 * After 8 weeks: 60%
 */
export async function computeTrainingHours(category: TrainingCategory): Promise<TrainingHours> {
  const sessions = await db.sessions.toArray()
  const categorySessionsMs = sessions
    .filter(s => getCategory(s.type) === category)
    .reduce((sum, s) => sum + (s.actualSec || 0), 0)

  const totalHours = Math.round(categorySessionsMs / 3600 * 100) / 100

  // Find last activity
  const categorySessions = sessions
    .filter(s => getCategory(s.type) === category)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const lastSession = categorySessions.length > 0 ? categorySessions[0] : null

  const now = new Date()
  const lastActivityDate = lastSession ? new Date(lastSession.date) : new Date(0)
  const daysInactive = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))
  const weeksInactive = daysInactive / 7

  // Apply 5% per week decay
  const decayRate = 0.05
  const activeHours = Math.max(0, Math.round(totalHours * (1 - decayRate * weeksInactive) * 100) / 100)

  // Hours in past 7 days (no decay)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const hoursThisWeekMs = sessions
    .filter(s => getCategory(s.type) === category && s.date >= sevenDaysAgo)
    .reduce((sum, s) => sum + (s.actualSec || 0), 0)
  const hoursThisWeek = Math.round(hoursThisWeekMs / 3600 * 100) / 100

  // Nudge if less than 1 hour in past 7 days
  const needsNudge = hoursThisWeek < 1 && daysInactive > 0

  return {
    category,
    totalHours: activeHours,
    lastActivityDaysAgo: daysInactive,
    hoursThisWeek,
    needsNudge
  }
}

/**
 * Get all three training categories with their hours
 */
export async function computeAllTrainingHours(): Promise<TrainingHours[]> {
  const [bjj, calisthenics, mobility] = await Promise.all([
    computeTrainingHours('bjj'),
    computeTrainingHours('calisthenics'),
    computeTrainingHours('mobility')
  ])
  return [bjj, calisthenics, mobility]
}

/**
 * Get nudge message for a category
 */
export function getNudgeMessage(training: TrainingHours): string {
  if (!training.needsNudge) return ''

  const categoryName = {
    bjj: 'BJJ',
    calisthenics: 'Calisthenics',
    mobility: 'Mobility'
  }[training.category]

  // Handle never-trained case (very high days since Unix epoch)
  if (training.lastActivityDaysAgo > 1000) {
    return `Start logging ${categoryName} to begin tracking your progress.`
  }

  if (training.lastActivityDaysAgo === 0) {
    return `Great! Keep the streak going — log 1 more hour of ${categoryName} this week.`
  }

  if (training.lastActivityDaysAgo <= 7) {
    return `${categoryName} needs a refresh — log 1 hour this week to stay sharp.`
  }

  if (training.lastActivityDaysAgo <= 14) {
    return `${categoryName} skills are fading. Log 1 hour this week to stop the decay.`
  }

  return `${categoryName} hasn't been logged in ${training.lastActivityDaysAgo} days. Time for a session!`
}

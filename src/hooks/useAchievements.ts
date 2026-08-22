import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { computeStreak } from '../lib/recommendation'
import { useState, useEffect } from 'react'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  progress: number // 0-1
  tier: 'bronze' | 'silver' | 'gold'
}

export interface AchievementStats {
  masteryLevel: number
  masteryXP: number
  masteryNextXP: number
  disciplineLevel: number
  disciplineXP: number
  disciplineNextXP: number
  totalPRs: number
  uniqueExercises: number
  longestStreak: number
  currentStreak: number
  achievements: Achievement[]
}

const MASTERY_XP_PER_LEVEL = 500
const DISCIPLINE_XP_PER_LEVEL = 300

export function useAchievements(): AchievementStats | null {
  const logs = useLiveQuery(() => db.calisthenicsLogs.toArray(), [], null)
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], null)
  const [currentStreak, setCurrentStreak] = useState(0)

  useEffect(() => {
    computeStreak().then(setCurrentStreak)
  }, [logs])

  if (!logs || !sessions) return null

  // Mastery: XP from PRs and exercise variety
  const exerciseBests = new Map<string, number>()
  let totalPRs = 0
  for (const log of logs) {
    const prev = exerciseBests.get(log.exerciseId) || 0
    if (log.value > prev) {
      if (prev > 0) totalPRs++
      exerciseBests.set(log.exerciseId, log.value)
    }
  }
  const uniqueExercises = exerciseBests.size
  const masteryXP = totalPRs * 50 + uniqueExercises * 30
  const masteryLevel = Math.floor(masteryXP / MASTERY_XP_PER_LEVEL) + 1
  const masteryNextXP = masteryLevel * MASTERY_XP_PER_LEVEL

  // Discipline: XP from consistency and volume
  const trainingDays = new Set(logs.map((l) => l.date)).size
  const totalSessions = sessions.length
  const disciplineXP = trainingDays * 20 + totalSessions * 15 + currentStreak * 10
  const disciplineLevel = Math.floor(disciplineXP / DISCIPLINE_XP_PER_LEVEL) + 1
  const disciplineNextXP = disciplineLevel * DISCIPLINE_XP_PER_LEVEL

  // Longest streak computation
  const dates = [...new Set(logs.map((l) => l.date))].sort()
  let longestStreak = 0
  let streak = 1
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + 'T12:00:00')
    const curr = new Date(dates[i] + 'T12:00:00')
    const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 1) {
      streak++
    } else {
      longestStreak = Math.max(longestStreak, streak)
      streak = 1
    }
  }
  longestStreak = Math.max(longestStreak, streak)

  // Achievement definitions
  const achievements: Achievement[] = [
    {
      id: 'first_pr', name: 'Record Breaker', description: 'Set your first personal record',
      icon: '🏆', unlocked: totalPRs >= 1, progress: Math.min(1, totalPRs / 1), tier: 'bronze',
    },
    {
      id: 'ten_prs', name: 'PR Machine', description: 'Set 10 personal records',
      icon: '⚡', unlocked: totalPRs >= 10, progress: Math.min(1, totalPRs / 10), tier: 'silver',
    },
    {
      id: 'variety', name: 'Well Rounded', description: 'Train 10 different exercises',
      icon: '🎯', unlocked: uniqueExercises >= 10, progress: Math.min(1, uniqueExercises / 10), tier: 'bronze',
    },
    {
      id: 'variety_gold', name: 'Master of All', description: 'Train 20 different exercises',
      icon: '👑', unlocked: uniqueExercises >= 20, progress: Math.min(1, uniqueExercises / 20), tier: 'gold',
    },
    {
      id: 'streak_7', name: 'Weekly Warrior', description: '7-day training streak',
      icon: '🔥', unlocked: longestStreak >= 7, progress: Math.min(1, longestStreak / 7), tier: 'bronze',
    },
    {
      id: 'streak_30', name: 'Iron Discipline', description: '30-day training streak',
      icon: '💎', unlocked: longestStreak >= 30, progress: Math.min(1, longestStreak / 30), tier: 'gold',
    },
    {
      id: 'sessions_50', name: 'Dedicated', description: 'Complete 50 sessions',
      icon: '🏋️', unlocked: totalSessions >= 50, progress: Math.min(1, totalSessions / 50), tier: 'silver',
    },
    {
      id: 'days_30', name: 'Monthly Regular', description: 'Train on 30 different days',
      icon: '📅', unlocked: trainingDays >= 30, progress: Math.min(1, trainingDays / 30), tier: 'silver',
    },
  ]

  return {
    masteryLevel,
    masteryXP,
    masteryNextXP,
    disciplineLevel,
    disciplineXP,
    disciplineNextXP,
    totalPRs,
    uniqueExercises,
    longestStreak,
    currentStreak,
    achievements,
  }
}

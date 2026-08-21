import { describe, it, expect } from 'vitest'
import { computeForecastInsights, computeSupercompensation, type DayPoint } from '../supercompensation'
import type { CalisthenicsLog } from '../../db/db'

function makeCalLog(overrides: Partial<CalisthenicsLog> & { exerciseId: string; date: string }): CalisthenicsLog {
  return {
    id: 1,
    exerciseId: overrides.exerciseId,
    date: overrides.date,
    metric: 'reps',
    value: 10,
    sets: 3,
    createdAt: new Date(overrides.date).toISOString(),
    ...overrides,
  } as CalisthenicsLog
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

describe('computeForecastInsights', () => {
  it('returns no insights when all categories are at baseline', () => {
    const data = computeSupercompensation([], [], 30, [], 7)
    const insights = computeForecastInsights(data)
    expect(insights).toHaveLength(0)
  })

  it('returns insight with peakDay > 0 for a rising category', () => {
    const logs = [
      makeCalLog({ exerciseId: 'push_up', date: daysAgo(2), value: 25, sets: 5 }),
      makeCalLog({ exerciseId: 'push_up', date: daysAgo(1), value: 25, sets: 5 }),
    ]
    const data = computeSupercompensation(logs, [], 30, [], 14)
    const insights = computeForecastInsights(data)
    const pushInsight = insights.find(i => i.category === 'push')
    if (pushInsight) {
      expect(pushInsight.peakDay).toBeGreaterThan(0)
      expect(pushInsight.peakValue).toBeGreaterThan(103)
    }
  })

  it('results are sorted by peakDay ascending', () => {
    const logs = [
      makeCalLog({ exerciseId: 'push_up', date: daysAgo(2), value: 25, sets: 5 }),
      makeCalLog({ exerciseId: 'pull_up', date: daysAgo(3), value: 15, sets: 4 }),
    ]
    const data = computeSupercompensation(logs, [], 30, [], 14)
    const insights = computeForecastInsights(data)
    for (let i = 1; i < insights.length; i++) {
      expect(insights[i].peakDay).toBeGreaterThanOrEqual(insights[i - 1].peakDay)
    }
  })

  it('only returns insights where peakValue > 103', () => {
    const log = makeCalLog({ exerciseId: 'push_up', date: daysAgo(1), value: 25, sets: 5 })
    const data = computeSupercompensation([log], [], 30, [], 14)
    const insights = computeForecastInsights(data)
    for (const insight of insights) {
      expect(insight.peakValue).toBeGreaterThan(103)
    }
  })
})

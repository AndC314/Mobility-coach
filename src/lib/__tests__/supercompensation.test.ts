import { describe, it, expect } from 'vitest'
import { computeSupercompensation, type FitnessCategory } from '../supercompensation'
import type { CalisthenicsLog, BjjClassLog, CompletedSession } from '../../db/db'

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

function makeBjjLog(date: string, technicalMins = 30, sparringMins = 30): BjjClassLog {
  return {
    id: 1,
    date,
    tagIds: [],
    technicalMins,
    sparringMins,
    createdAt: new Date(date).toISOString(),
  }
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

describe('computeSupercompensation', () => {
  it('returns flat baseline (100) for empty logs', () => {
    const result = computeSupercompensation([], [], 30)
    expect(result.length).toBe(30)
    for (const point of result) {
      expect(point.push).toBe(100)
      expect(point.pull).toBe(100)
      expect(point.grappling).toBe(100)
      expect(point.mob_hips).toBe(100)
    }
  })

  it('shows dip below 100 on day+1 after a hard push session', () => {
    const log = makeCalLog({ exerciseId: 'push_up', date: daysAgo(3), value: 20, sets: 4 })
    const result = computeSupercompensation([log], [], 30)
    const dayAfterTraining = result.find(p => p.date === daysAgo(2))
    expect(dayAfterTraining).toBeDefined()
    expect(dayAfterTraining!.push).toBeLessThan(100)
  })

  it('recovers above baseline by day+5 after a session', () => {
    const log = makeCalLog({ exerciseId: 'push_up', date: daysAgo(10), value: 20, sets: 4 })
    const result = computeSupercompensation([log], [], 30)
    const dayFiveAfter = result.find(p => p.date === daysAgo(5))
    expect(dayFiveAfter).toBeDefined()
    expect(dayFiveAfter!.push).toBeGreaterThan(100)
  })

  it('uses different time constants per category', () => {
    const pushLog = makeCalLog({ exerciseId: 'push_up', date: daysAgo(5), value: 20, sets: 4 })
    const bjjLog = makeBjjLog(daysAgo(5), 45, 45)
    const result = computeSupercompensation([pushLog], [bjjLog], 30)
    const today = result[result.length - 1]
    // Grappling has longer tau1 (25 vs 21) so fitness effect lingers differently
    expect(today.push).not.toEqual(today.grappling)
  })

  it('minimum impulse floor: light session still produces adaptation', () => {
    const lightLog = makeCalLog({ exerciseId: 'push_up', date: daysAgo(5), value: 1, sets: 1 })
    const result = computeSupercompensation([lightLog], [], 30)
    const today = result[result.length - 1]
    // Even 1 rep × 1 set should still produce some effect above baseline
    expect(today.push).not.toBe(100)
  })

  it('atrophy kicks in after 10 inactive days', () => {
    const log = makeCalLog({ exerciseId: 'push_up', date: daysAgo(25), value: 20, sets: 4 })
    const result = computeSupercompensation([log], [], 30)
    const today = result[result.length - 1]
    // 25 days ago means ~15 days past the atrophy threshold
    expect(today.push).toBeLessThan(100)
  })

  it('atrophy floor at 70', () => {
    const log = makeCalLog({ exerciseId: 'push_up', date: daysAgo(80), value: 20, sets: 4 })
    const result = computeSupercompensation([log], [], 90)
    const today = result[result.length - 1]
    expect(today.push).toBeGreaterThanOrEqual(70)
  })

  it('two sessions produce higher fitness than one', () => {
    const oneSession = [makeCalLog({ exerciseId: 'push_up', date: daysAgo(7), value: 20, sets: 4 })]
    const twoSessions = [
      makeCalLog({ exerciseId: 'push_up', date: daysAgo(10), value: 20, sets: 4 }),
      makeCalLog({ exerciseId: 'push_up', date: daysAgo(5), value: 20, sets: 4 }),
    ]
    const r1 = computeSupercompensation(oneSession, [], 30)
    const r2 = computeSupercompensation(twoSessions, [], 30)
    const today1 = r1[r1.length - 1].push
    const today2 = r2[r2.length - 1].push
    expect(today2).toBeGreaterThan(today1)
  })

  it('density factor: shorter rest produces bigger impulse', () => {
    const normalRest = makeCalLog({ exerciseId: 'push_up', date: daysAgo(5), value: 10, sets: 3, restSec: 90 })
    const shortRest = makeCalLog({ exerciseId: 'push_up', date: daysAgo(5), value: 10, sets: 3, restSec: 30 })
    const r1 = computeSupercompensation([normalRest], [], 30)
    const r2 = computeSupercompensation([shortRest], [], 30)
    // Short rest should yield higher adaptation (further from 100 in either direction)
    const today1 = r1[r1.length - 1].push
    const today2 = r2[r2.length - 1].push
    expect(Math.abs(today2 - 100)).toBeGreaterThan(Math.abs(today1 - 100))
  })

  it('forecast mode adds isForecast entries', () => {
    const result = computeSupercompensation([], [], 30, [], 7)
    const forecast = result.filter(p => p.isForecast)
    expect(forecast.length).toBe(7)
  })

  it('forecast entries come after history entries', () => {
    const log = makeCalLog({ exerciseId: 'push_up', date: daysAgo(3), value: 20, sets: 4 })
    const result = computeSupercompensation([log], [], 30, [], 7)
    const firstForecast = result.findIndex(p => p.isForecast)
    expect(firstForecast).toBe(30)
    expect(result.length).toBe(37)
  })
})

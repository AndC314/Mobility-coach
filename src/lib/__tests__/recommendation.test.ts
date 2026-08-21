import { describe, it, expect } from 'vitest'
import { computeRecoveryScore } from '../recommendation'

describe('computeRecoveryScore', () => {
  it('fresh state (no debuffs, no streak) → 98 (clamped from 100)', () => {
    const score = computeRecoveryScore({
      bjjYesterday: false,
      soreAreasCount: 0,
      streak: 0,
      suppressedCount: 0,
    })
    expect(score).toBe(98)
  })

  it('BJJ yesterday subtracts 12 points', () => {
    const score = computeRecoveryScore({
      bjjYesterday: true,
      soreAreasCount: 0,
      streak: 0,
      suppressedCount: 0,
    })
    expect(score).toBe(88)
  })

  it('3 sore areas subtracts 18 points', () => {
    const score = computeRecoveryScore({
      bjjYesterday: false,
      soreAreasCount: 3,
      streak: 0,
      suppressedCount: 0,
    })
    expect(score).toBe(82)
  })

  it('streak bonus caps at 5 × 1.5 = 7.5 (rounds to 8)', () => {
    const score5 = computeRecoveryScore({
      bjjYesterday: true,
      soreAreasCount: 0,
      streak: 5,
      suppressedCount: 0,
    })
    const score10 = computeRecoveryScore({
      bjjYesterday: true,
      soreAreasCount: 0,
      streak: 10,
      suppressedCount: 0,
    })
    // Both should equal 100 - 12 + 7.5 = 95.5 → 96
    expect(score5).toBe(score10)
    expect(score5).toBe(96)
  })

  it('suppressed categories subtract 8 each', () => {
    const score = computeRecoveryScore({
      bjjYesterday: false,
      soreAreasCount: 0,
      streak: 0,
      suppressedCount: 2,
    })
    // 100 - 16 = 84
    expect(score).toBe(84)
  })

  it('combined worst case clamps at 35', () => {
    const score = computeRecoveryScore({
      bjjYesterday: true,
      soreAreasCount: 7,
      streak: 0,
      suppressedCount: 5,
    })
    // 100 - 12 - 42 + 0 - 40 = 6 → clamped to 35
    expect(score).toBe(35)
  })

  it('upper clamp at 98 even with max streak', () => {
    const score = computeRecoveryScore({
      bjjYesterday: false,
      soreAreasCount: 0,
      streak: 100,
      suppressedCount: 0,
    })
    // 100 + 7.5 = 107.5 → clamped to 98
    expect(score).toBe(98)
  })
})

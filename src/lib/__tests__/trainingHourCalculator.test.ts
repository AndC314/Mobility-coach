import { describe, it, expect } from 'vitest'
import { applyDecay } from '../trainingHourCalculator'

describe('applyDecay', () => {
  it('0 days inactive → 100% retention', () => {
    expect(applyDecay(100, 0)).toBe(100)
  })

  it('7 days (1 week) inactive → 95%', () => {
    expect(applyDecay(100, 7)).toBeCloseTo(95, 5)
  })

  it('14 days (2 weeks) inactive → 90%', () => {
    expect(applyDecay(100, 14)).toBeCloseTo(90, 5)
  })

  it('28 days (4 weeks) inactive → 80%', () => {
    expect(applyDecay(100, 28)).toBeCloseTo(80, 5)
  })

  it('56 days (8 weeks) inactive → 60%', () => {
    expect(applyDecay(100, 56)).toBeCloseTo(60, 5)
  })

  it('140 days (20 weeks) inactive → 0% (floored)', () => {
    expect(applyDecay(100, 140)).toBe(0)
  })

  it('200 days → stays at 0 (does not go negative)', () => {
    expect(applyDecay(100, 200)).toBe(0)
  })

  it('0 total hours → stays 0 regardless of decay', () => {
    expect(applyDecay(0, 50)).toBe(0)
  })

  it('proportional: 50 hours × 2 weeks = 45 hours', () => {
    expect(applyDecay(50, 14)).toBeCloseTo(45, 5)
  })
})

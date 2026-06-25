import { useLiveQuery } from 'dexie-react-hooks'
import { computeTrainingHours } from '../lib/trainingHourCalculator'

export interface TrainingBars {
  mobilityPct: number
  calisthenicsPct: number
}

const HOURS_CAP = 30

function toPct(activeHours: number): number {
  return Math.min(100, Math.round((activeHours / HOURS_CAP) * 100))
}

const LOADING_DEFAULT: TrainingBars = { mobilityPct: 0, calisthenicsPct: 0 }

export function useTrainingBars(): TrainingBars {
  return useLiveQuery(async () => {
    const [mobility, calisthenics] = await Promise.all([
      computeTrainingHours('mobility'),
      computeTrainingHours('calisthenics'),
    ])
    return {
      mobilityPct: toPct(mobility.totalHours),
      calisthenicsPct: toPct(calisthenics.totalHours),
    }
  }, [], LOADING_DEFAULT) ?? LOADING_DEFAULT
}

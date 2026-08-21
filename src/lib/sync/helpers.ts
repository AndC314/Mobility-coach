import type { CreatedAtValue } from './types'

export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) result[key] = value
  }
  return result as T
}

export function normalizeCreatedAt(createdAt: CreatedAtValue, fallbackDate: string): string {
  if (typeof createdAt === 'string' && createdAt.length > 0) return createdAt
  if (createdAt && typeof createdAt === 'object' && 'toDate' in createdAt) {
    return createdAt.toDate().toISOString()
  }
  if (typeof createdAt === 'number') return new Date(createdAt).toISOString()
  return `${fallbackDate}T00:00:00.000Z`
}

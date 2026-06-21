// ─────────────────────────────────────────────────────────────────────────
// DATE UTILITIES — all in LOCAL time, never UTC.
//
// Date.prototype.toISOString() always converts to UTC, which silently
// shifts the date by one day for any timezone ahead of UTC once local
// time passes midnight UTC (e.g. Amsterdam after 1am/2am). Every date
// used for day-keys in this app (sessions, soreness logs, calendar, BJJ
// logs, streaks) must use the local calendar date instead.
// ─────────────────────────────────────────────────────────────────────────

/** Local YYYY-MM-DD — use this everywhere instead of date.toISOString().slice(0,10). */
export function isoDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayIso(): string {
  return isoDate(new Date())
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function dayName(d: Date): string {
  return DAY_NAMES[d.getDay()]
}

export function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day // Monday-first
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

// Dates are local-time 'YYYY-MM-DD' keys; UTC would put late-evening logs on the wrong day.
export function dateKey(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parse(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = parse(key)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

// Weeks start on Monday.
export function weekStart(key: string): string {
  return addDays(key, -((parse(key).getDay() + 6) % 7))
}

// Distinct days with a log in the `n` days ending today.
export function activeDays(dates: string[], today: string, n = 7): number {
  const from = addDays(today, -(n - 1))
  return new Set(dates.filter((d) => d >= from && d <= today)).size
}

export function daysBetween(from: string, to: string): number {
  // Math.round absorbs the 1h DST shift.
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000)
}

// Logs per Monday-start week, newest first, from the oldest log's week to this week (empty weeks included).
export function weekCounts(dates: string[], today: string): { start: string; count: number }[] {
  if (!dates.length) return []
  const counts = new Map<string, number>()
  for (const d of dates) counts.set(weekStart(d), (counts.get(weekStart(d)) ?? 0) + 1)
  const first = weekStart(dates.reduce((a, b) => (a < b ? a : b)))
  const weeks = []
  for (let w = weekStart(today); w >= first; w = addDays(w, -7)) weeks.push({ start: w, count: counts.get(w) ?? 0 })
  return weeks
}

// Day keys for a 'YYYY-MM' month view: whole Monday-start weeks, padded with days from neighbouring months.
export function monthGrid(month: string): string[] {
  const days = []
  for (let d = weekStart(`${month}-01`); d.startsWith(month) || days.length % 7 || !days.length; d = addDays(d, 1)) days.push(d)
  return days
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  return dateKey(new Date(y, m - 1 + n, 1)).slice(0, 7)
}

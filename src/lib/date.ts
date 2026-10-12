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

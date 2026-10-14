import type { Cadence, Checkin, Habit, Note } from '@/db'

export interface Backup {
  app: 'anchor-habits'
  version: 1
  exportedAt: number
  habits: Habit[]
  checkins: Checkin[]
  notes: Note[]
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

// Backup files come from outside the app, so check every field and copy only known ones.
// Throws an Error with a message fit to show the user.
export function parseBackup(text: string): Backup {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { throw new Error("This file isn't an Anchor Habits backup.") }
  const o = raw as Record<string, unknown>
  if (!o || o.app !== 'anchor-habits') throw new Error("This file isn't an Anchor Habits backup.")
  if (o.version !== 1) throw new Error('This backup is from a newer version of the app.')
  if (!Array.isArray(o.habits) || !Array.isArray(o.checkins) || !Array.isArray(o.notes)) throw broken()

  const habits = o.habits.map((h): Habit => {
    if (!isId(h.id) || !isText(h.name) || !(h.active === 0 || h.active === 1) || !isNum(h.createdAt)) throw broken()
    if (h.prompt !== undefined && !isText(h.prompt)) throw broken()
    return { id: h.id, name: h.name, prompt: h.prompt, cadence: cadence(h.cadence), active: h.active, createdAt: h.createdAt }
  })
  const ids = new Set(habits.map((h) => h.id))
  const owned = (x: Record<string, unknown>) => isId(x.habitId) && ids.has(x.habitId) && typeof x.date === 'string' && DATE.test(x.date) && isNum(x.createdAt)

  const checkins = o.checkins.map((c): Checkin => {
    if (!isId(c.id) || !owned(c) || (c.note !== undefined && !isText(c.note))) throw broken()
    return { id: c.id, habitId: c.habitId, date: c.date, note: c.note, createdAt: c.createdAt }
  })
  const notes = o.notes.map((n): Note => {
    if (!isId(n.id) || !owned(n) || !isText(n.text)) throw broken()
    return { id: n.id, habitId: n.habitId, date: n.date, text: n.text, createdAt: n.createdAt }
  })
  return { app: 'anchor-habits', version: 1, exportedAt: isNum(o.exportedAt) ? o.exportedAt : 0, habits, checkins, notes }
}

function cadence(c: unknown): Cadence {
  const o = c as Record<string, unknown>
  if (o?.type === 'flexible') return { type: 'flexible' }
  if (o?.type === 'weekly' && Number.isInteger(o.n) && (o.n as number) >= 1 && (o.n as number) <= 7) return { type: 'weekly', n: o.n as number }
  throw broken()
}

const broken = () => new Error('This backup file is damaged and could not be restored.')
const isId = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isText = (v: unknown): v is string => typeof v === 'string' && v.length <= 1000

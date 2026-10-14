import Dexie, { type EntityTable } from 'dexie'
import type { Backup } from '@/lib/backup'

export type Cadence = { type: 'weekly'; n: number } | { type: 'flexible' }

export interface Habit {
  id: number
  name: string
  prompt?: string
  cadence: Cadence
  active: 0 | 1 // number, not boolean: IndexedDB cannot index booleans
  createdAt: number
}

export interface Checkin {
  id: number
  habitId: number
  date: string // local 'YYYY-MM-DD', see lib/date.ts
  note?: string
  createdAt: number
}

// A note written on a day without logging it, so typed text is never lost.
export interface Note {
  id: number
  habitId: number
  date: string
  text: string
  createdAt: number
}

export const MAX_ACTIVE = 3

export const db = new Dexie('anchor-habits') as Dexie & {
  habits: EntityTable<Habit, 'id'>
  checkins: EntityTable<Checkin, 'id'>
  notes: EntityTable<Note, 'id'>
}

db.version(1).stores({
  habits: '++id, active',
  checkins: '++id, habitId, date',
})
db.version(2).stores({
  notes: '++id, habitId',
})

export function cadenceLabel(c: Cadence): string {
  return c.type === 'weekly' ? `${c.n}× per week` : 'Flexible'
}

// New habits join the focus list when there is room.
export function addHabit(h: Pick<Habit, 'name' | 'prompt' | 'cadence'>) {
  return db.transaction('rw', db.habits, async () => {
    const full = (await db.habits.where('active').equals(1).count()) >= MAX_ACTIVE
    return db.habits.add({ ...h, active: full ? 0 : 1, createdAt: Date.now() })
  })
}

// Returns false when the focus list is already full.
export function setActive(id: number, active: boolean) {
  return db.transaction('rw', db.habits, async () => {
    if (active && (await db.habits.where('active').equals(1).count()) >= MAX_ACTIVE) return false
    await db.habits.update(id, { active: active ? 1 : 0 })
    return true
  })
}

// Removes the habit with all its logs and notes, all or nothing.
export function deleteHabit(id: number) {
  return db.transaction('rw', db.habits, db.checkins, db.notes, async () => {
    await db.checkins.where('habitId').equals(id).delete()
    await db.notes.where('habitId').equals(id).delete()
    await db.habits.delete(id)
  })
}

export async function exportBackup(): Promise<Backup> {
  return db.transaction('r', db.habits, db.checkins, db.notes, async () => ({
    app: 'anchor-habits' as const,
    version: 1 as const,
    exportedAt: Date.now(),
    habits: await db.habits.toArray(),
    checkins: await db.checkins.toArray(),
    notes: await db.notes.toArray(),
  }))
}

// Replaces everything with the backup, all or nothing. Pass only output of parseBackup.
export function restoreBackup(b: Backup) {
  return db.transaction('rw', db.habits, db.checkins, db.notes, async () => {
    await Promise.all([db.habits.clear(), db.checkins.clear(), db.notes.clear()])
    await db.habits.bulkAdd(b.habits)
    await db.checkins.bulkAdd(b.checkins)
    await db.notes.bulkAdd(b.notes)
  })
}

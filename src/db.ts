import Dexie, { type EntityTable } from 'dexie'

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

export const MAX_ACTIVE = 3

export const db = new Dexie('anchor-habits') as Dexie & {
  habits: EntityTable<Habit, 'id'>
  checkins: EntityTable<Checkin, 'id'>
}

db.version(1).stores({
  habits: '++id, active',
  checkins: '++id, habitId, date',
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

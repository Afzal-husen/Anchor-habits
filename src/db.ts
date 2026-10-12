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

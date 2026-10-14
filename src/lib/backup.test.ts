import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseBackup } from './backup.ts'

const good = {
  app: 'anchor-habits', version: 1, exportedAt: 1,
  habits: [{ id: 1, name: 'Read', cadence: { type: 'weekly', n: 3 }, active: 1, createdAt: 1, junk: 'x' }],
  checkins: [{ id: 1, habitId: 1, date: '2026-10-14', note: 'ok', createdAt: 2 }],
  notes: [{ id: 1, habitId: 1, date: '2026-10-13', text: 'later', createdAt: 3 }],
}
const parse = (o: unknown) => parseBackup(JSON.stringify(o))

test('parseBackup accepts a valid backup and drops unknown fields', () => {
  const b = parse(good)
  assert.equal(b.habits.length, 1)
  assert.equal('junk' in b.habits[0], false)
  assert.equal(b.checkins[0].note, 'ok')
})

test('parseBackup rejects other files, bad fields and orphan logs', () => {
  assert.throws(() => parseBackup('not json'), /isn't an Anchor Habits backup/)
  assert.throws(() => parse({ ...good, app: 'other' }), /isn't an Anchor Habits backup/)
  assert.throws(() => parse({ ...good, version: 2 }), /newer version/)
  assert.throws(() => parse({ ...good, habits: [{ ...good.habits[0], cadence: { type: 'weekly', n: 9 } }] }), /damaged/)
  assert.throws(() => parse({ ...good, checkins: [{ ...good.checkins[0], date: '14/10/2026' }] }), /damaged/)
  assert.throws(() => parse({ ...good, notes: [{ ...good.notes[0], habitId: 99 }] }), /damaged/)
})

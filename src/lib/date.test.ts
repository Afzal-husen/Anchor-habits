import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addDays, dateKey, daysBetween, weekStart } from './date.ts'

test('dateKey uses local time, not UTC', () => {
  assert.equal(dateKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05')
})

test('addDays crosses month and year', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01')
  assert.equal(addDays('2026-01-01', -1), '2025-12-31')
})

test('weekStart is Monday', () => {
  assert.equal(weekStart('2026-10-12'), '2026-10-12') // Monday
  assert.equal(weekStart('2026-10-18'), '2026-10-12') // Sunday
  assert.equal(weekStart('2026-10-01'), '2026-09-28') // Thursday, previous month
})

test('daysBetween spans DST change', () => {
  assert.equal(daysBetween('2026-03-01', '2026-04-01'), 31)
  assert.equal(daysBetween('2026-10-12', '2026-10-12'), 0)
})

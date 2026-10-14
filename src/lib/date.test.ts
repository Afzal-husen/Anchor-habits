import { test } from 'node:test'
import assert from 'node:assert/strict'
import { activeDays, addDays, addMonths, dateKey, daysBetween, monthGrid, weekCounts, weekStart } from './date.ts'

test('activeDays counts distinct days in the window', () => {
  const dates = ['2026-10-12', '2026-10-12', '2026-10-06', '2026-10-05', '2026-10-13']
  // 10-05 is 7 days back (outside), 10-13 is in the future (outside), duplicates count once
  assert.equal(activeDays(dates, '2026-10-12'), 2)
  assert.equal(activeDays([], '2026-10-12'), 0)
})

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

test('weekCounts fills empty weeks, newest first', () => {
  assert.deepEqual(weekCounts(['2026-09-30', '2026-10-01', '2026-10-13'], '2026-10-14'), [
    { start: '2026-10-12', count: 1 },
    { start: '2026-10-05', count: 0 },
    { start: '2026-09-28', count: 2 },
  ])
  assert.deepEqual(weekCounts([], '2026-10-14'), [])
})

test('monthGrid covers whole Monday-start weeks', () => {
  const oct = monthGrid('2026-10') // Oct 1 2026 is a Thursday
  assert.equal(oct[0], '2026-09-28')
  assert.equal(oct.at(-1), '2026-11-01')
  assert.equal(oct.length, 35)
  assert.equal(monthGrid('2027-02')[0], '2027-02-01') // starts on a Monday, no padding
  assert.equal(monthGrid('2027-02').length, 28)
})

test('addMonths crosses years', () => {
  assert.equal(addMonths('2026-01', -1), '2025-12')
  assert.equal(addMonths('2026-12', 1), '2027-01')
})

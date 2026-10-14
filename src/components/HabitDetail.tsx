import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeftIcon, Trash2Icon } from 'lucide-react'
import { cadenceLabel, db, deleteHabit } from '@/db'
import { activeDays, addDays, dateKey, weekCounts } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { HabitForm } from '@/components/HabitForm'
import { MonthCalendar } from '@/components/MonthCalendar'
import { DaySheet } from '@/components/DaySheet'

const shortDate = (key: string) => new Date(`${key}T00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

function dayLabel(key: string, today: string): string {
  if (key === today) return 'Today'
  if (key === addDays(today, -1)) return 'Yesterday'
  return new Date(`${key}T00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function HabitDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const today = dateKey()
  // shortcut: loads every log for the habit; paginate if lists reach thousands.
  const data = useLiveQuery(async () => ({
    habit: await db.habits.get(id),
    checkins: await db.checkins.where('habitId').equals(id).reverse().sortBy('date'),
    noteDates: (await db.notes.where('habitId').equals(id).toArray()).map((n) => n.date),
  }), [id])
  const [editing, setEditing] = useState(false)
  // Keep the picked date while closing, so the sheet can animate out with its content.
  const [picked, setPicked] = useState<string>()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Delete takes two taps: the first arms the button for 3 seconds.
  const [armed, setArmed] = useState<number>()
  useEffect(() => {
    if (armed === undefined) return
    const t = setTimeout(() => setArmed(undefined), 3000)
    return () => clearTimeout(t)
  }, [armed])

  if (!data) return null
  const { habit, checkins, noteDates } = data
  if (!habit) return null
  const weeks = weekCounts(checkins.map((c) => c.date), today)
  const target = habit.cadence.type === 'weekly' ? habit.cadence.n : undefined
  const noteCount = noteDates.length + checkins.filter((c) => c.note).length

  async function remove() {
    await deleteHabit(id)
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith(`draft:${id}:`)) localStorage.removeItem(k)
    } catch { /* storage blocked: no drafts to clear */ }
    onBack()
  }
  const scale = Math.max(target ?? 0, ...weeks.map((w) => w.count))

  return (
    <div className="grid gap-6">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="size-11" aria-label="Back" onClick={onBack}>
          <ArrowLeftIcon />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{habit.name}</h1>
          <p className="text-sm text-muted-foreground">{cadenceLabel(habit.cadence)}</p>
        </div>
        <Button variant="outline" className="h-11 px-4" onClick={() => setEditing(true)}>Edit</Button>
      </header>

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card p-4 shadow-xs">
          <dt className="text-sm text-muted-foreground">Total sessions</dt>
          <dd className="text-3xl font-semibold tabular-nums">{checkins.length}</dd>
          {checkins.length > 0 && (
            <dd className="text-sm text-muted-foreground">
              since {shortDate(checkins[checkins.length - 1].date)} · {weeks.length} {weeks.length === 1 ? 'week' : 'weeks'}
            </dd>
          )}
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-xs">
          <dt className="text-sm text-muted-foreground">Last 7 days</dt>
          <dd className="text-3xl font-semibold tabular-nums">
            {activeDays(checkins.map((c) => c.date), today)}<span className="text-base font-normal text-muted-foreground"> of 7 active</span>
          </dd>
        </div>
      </dl>

      <section className="grid gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Calendar</h2>
        <MonthCalendar dates={checkins.map((c) => c.date)} noteDates={noteDates} today={today}
          onPick={(date) => { setPicked(date); setSheetOpen(true) }} />
      </section>

      {weeks.length > 0 && (
        <section className="grid gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Week by week</h2>
          <ul className="grid gap-3 rounded-2xl border bg-card p-4 shadow-xs">
            {weeks.map((w) => (
              <li key={w.start} className="grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-3 text-sm">
                <span className="text-muted-foreground">{w.start === weeks[0].start ? 'This week' : shortDate(w.start)}</span>
                <span aria-hidden className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${(w.count / scale) * 100}%` }} />
                </span>
                <span className="text-right font-medium tabular-nums">
                  {target !== undefined ? `${w.count}/${target}` : w.count}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Log</h2>
        {checkins.length ? (
          <ul className="grid gap-2">
            {checkins.map((c) => (
              <li key={c.id} className="flex items-start gap-2 rounded-2xl border bg-card p-3 pl-4 shadow-xs">
                <div className="flex-1 py-1">
                  <div className="text-sm font-medium">{dayLabel(c.date, today)}</div>
                  {c.note && <p className="text-sm whitespace-pre-line text-muted-foreground">{c.note}</p>}
                </div>
                {armed === c.id ? (
                  <Button variant="destructive" className="h-11 px-4" onClick={() => db.checkins.delete(c.id)}>
                    Delete
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" className="size-11" aria-label={`Delete log from ${dayLabel(c.date, today)}`}
                    onClick={() => setArmed(c.id)}>
                    <Trash2Icon />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No sessions yet. The first one counts.</p>
        )}
      </section>

      <Button variant="destructive" className="mt-4 h-11 justify-self-center px-4" onClick={() => setConfirmDelete(true)}>
        <Trash2Icon aria-hidden />Delete habit
      </Button>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {habit.name}?</DialogTitle>
            <DialogDescription>
              This removes the habit, its {checkins.length} {checkins.length === 1 ? 'log' : 'logs'} and{' '}
              {noteCount} {noteCount === 1 ? 'note' : 'notes'}. You can't undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="h-11" />}>Cancel</DialogClose>
            <Button variant="destructive" className="h-11" onClick={remove}>Delete habit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {picked && <DaySheet key={picked} habit={habit} date={picked} open={sheetOpen} onOpenChange={setSheetOpen} />}
      {editing && <HabitForm habit={habit} open onOpenChange={setEditing} />}
    </div>
  )
}

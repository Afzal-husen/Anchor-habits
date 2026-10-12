import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeftIcon, Trash2Icon } from 'lucide-react'
import { cadenceLabel, db } from '@/db'
import { activeDays, addDays, dateKey } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { HabitForm } from '@/components/HabitForm'

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
  }), [id])
  const [editing, setEditing] = useState(false)
  // Delete takes two taps: the first arms the button for 3 seconds.
  const [armed, setArmed] = useState<number>()
  useEffect(() => {
    if (armed === undefined) return
    const t = setTimeout(() => setArmed(undefined), 3000)
    return () => clearTimeout(t)
  }, [armed])

  if (!data) return null
  const { habit, checkins } = data
  if (!habit) return null

  return (
    <div className="grid gap-6">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="size-11" aria-label="Back" onClick={onBack}>
          <ArrowLeftIcon />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{habit.name}</h1>
          <p className="text-sm text-muted-foreground">{cadenceLabel(habit.cadence)}</p>
        </div>
        <Button variant="outline" className="h-11 px-4" onClick={() => setEditing(true)}>Edit</Button>
      </header>

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border p-4">
          <dt className="text-sm text-muted-foreground">Total sessions</dt>
          <dd className="text-3xl font-semibold">{checkins.length}</dd>
        </div>
        <div className="rounded-2xl border p-4">
          <dt className="text-sm text-muted-foreground">Last 7 days</dt>
          <dd className="text-3xl font-semibold">
            {activeDays(checkins.map((c) => c.date), today)}<span className="text-base font-normal text-muted-foreground"> of 7 active</span>
          </dd>
        </div>
      </dl>

      <section className="grid gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Log</h2>
        {checkins.length ? (
          <ul className="grid gap-2">
            {checkins.map((c) => (
              <li key={c.id} className="flex items-start gap-2 rounded-xl border p-3">
                <div className="flex-1 py-1">
                  <div className="text-sm font-medium">{dayLabel(c.date, today)}</div>
                  {c.note && <p className="text-sm text-muted-foreground">{c.note}</p>}
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

      {editing && <HabitForm habit={habit} open onOpenChange={setEditing} />}
    </div>
  )
}

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { cadenceLabel, db, MAX_ACTIVE, setActive, type Habit } from '@/db'
import { Button } from '@/components/ui/button'
import { HabitForm } from '@/components/HabitForm'

export function HabitsScreen() {
  const habits = useLiveQuery(() => db.habits.toArray(), [])
  // undefined = closed, null = new habit, Habit = editing
  const [editing, setEditing] = useState<Habit | null>()
  const [full, setFull] = useState(false)

  async function toggle(h: Habit) {
    setFull(!(await setActive(h.id, !h.active)))
  }

  if (!habits) return null
  const focus = habits.filter((h) => h.active)
  const rest = habits.filter((h) => !h.active)

  const row = (h: Habit) => (
    <li key={h.id} className="flex items-center gap-2 rounded-xl border p-3">
      <button type="button" onClick={() => setEditing(h)} className="min-h-11 flex-1 text-left">
        <div className="font-medium">{h.name}</div>
        <div className="text-sm text-muted-foreground">{cadenceLabel(h.cadence)}</div>
      </button>
      <Button variant={h.active ? 'secondary' : 'outline'} className="h-11 px-4" onClick={() => toggle(h)}>
        {h.active ? 'Unfocus' : 'Focus'}
      </Button>
    </li>
  )

  return (
    <div className="grid gap-6">
      <section className="grid gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">In focus ({focus.length}/{MAX_ACTIVE})</h2>
        {focus.length ? <ul className="grid gap-2">{focus.map(row)}</ul>
          : <p className="text-sm text-muted-foreground">Pick up to {MAX_ACTIVE} habits to show on Today.</p>}
        {full && (
          <p role="status" className="text-sm text-muted-foreground">
            {MAX_ACTIVE} habits are in focus. Unfocus one to swap.
          </p>
        )}
      </section>

      {rest.length > 0 && (
        <section className="grid gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Resting</h2>
          <ul className="grid gap-2">{rest.map(row)}</ul>
        </section>
      )}

      <Button size="lg" className="h-11" onClick={() => setEditing(null)}>New habit</Button>

      {editing !== undefined && (
        <HabitForm key={editing?.id ?? 'new'} habit={editing ?? undefined} open
          onOpenChange={(o) => { if (!o) { setEditing(undefined); setFull(false) } }} />
      )}
    </div>
  )
}

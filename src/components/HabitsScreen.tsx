import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { PlusIcon } from 'lucide-react'
import { cadenceLabel, db, MAX_ACTIVE, setActive, type Habit } from '@/db'
import { Button } from '@/components/ui/button'
import { HabitForm } from '@/components/HabitForm'

export function HabitsScreen({ onOpen }: { onOpen: (id: number) => void }) {
  const habits = useLiveQuery(() => db.habits.toArray(), [])
  const [creating, setCreating] = useState(false)
  const [full, setFull] = useState(false)

  async function toggle(h: Habit) {
    setFull(!(await setActive(h.id, !h.active)))
  }

  if (!habits) return null
  const focus = habits.filter((h) => h.active)
  const rest = habits.filter((h) => !h.active)

  const row = (h: Habit) => (
    <li key={h.id} className="flex items-center gap-2 rounded-2xl border bg-card p-3 pl-4 shadow-xs">
      <button type="button" onClick={() => onOpen(h.id)} className="min-h-11 flex-1 cursor-pointer rounded-lg text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
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

      <Button size="lg" className="h-12 rounded-xl text-base" onClick={() => setCreating(true)}><PlusIcon aria-hidden />New habit</Button>

      {creating && (
        <HabitForm open
          onOpenChange={(o) => { if (!o) { setCreating(false); setFull(false) } }} />
      )}
    </div>
  )
}

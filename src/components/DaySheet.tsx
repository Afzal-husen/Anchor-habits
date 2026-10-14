import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CheckIcon, Trash2Icon } from 'lucide-react'
import { db, type Habit } from '@/db'
import { dateKey } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'

const time = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

// Parent remounts this with a new `key` per date, so the draft loads for that date.
export function DaySheet({ habit, date, open, onOpenChange }: {
  habit: Habit
  date: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const data = useLiveQuery(async () => ({
    checkins: await db.checkins.where('habitId').equals(habit.id).filter((c) => c.date === date).sortBy('createdAt'),
    notes: await db.notes.where('habitId').equals(habit.id).filter((n) => n.date === date).sortBy('createdAt'),
  }), [habit.id, date])
  // Unsaved note text survives closing the sheet or the app, per habit and day, on this device.
  const draftKey = `draft:${habit.id}:${date}`
  const [draft, setDraftState] = useState(() => {
    try { return localStorage.getItem(draftKey) ?? '' } catch { return '' }
  })
  function setDraft(text: string) {
    setDraftState(text)
    try {
      if (text) localStorage.setItem(draftKey, text)
      else localStorage.removeItem(draftKey)
    } catch { /* storage blocked: the draft lasts only while the sheet is open */ }
  }
  // Delete takes two taps: the first arms the button for 3 seconds.
  const [armed, setArmed] = useState<string>()
  useEffect(() => {
    if (armed === undefined) return
    const t = setTimeout(() => setArmed(undefined), 3000)
    return () => clearTimeout(t)
  }, [armed])

  const checkins = data?.checkins ?? []
  // Older logs kept their note on the log itself (from the Today screen); show them with the other notes.
  const notes = [
    ...checkins.filter((c) => c.note).map((c) => ({ key: `log-note-${c.id}`, text: c.note!, createdAt: c.createdAt, remove: () => db.checkins.update(c.id, { note: undefined }) })),
    ...(data?.notes ?? []).map((n) => ({ key: `note-${n.id}`, text: n.text, createdAt: n.createdAt, remove: () => db.notes.delete(n.id) })),
  ].sort((a, b) => a.createdAt - b.createdAt)
  const label = new Date(`${date}T00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  // A log added later for a past day has no real time of day.
  const when = (ms: number) => (dateKey(new Date(ms)) === date ? time(ms) : 'Added later')

  async function addNote(e?: FormEvent) {
    e?.preventDefault()
    if (!draft.trim()) return
    await db.notes.add({ habitId: habit.id, date, text: draft.trim(), createdAt: Date.now() })
    setDraft('')
  }

  async function logIt() {
    navigator.vibrate?.(30)
    await db.checkins.add({ habitId: habit.id, date, createdAt: Date.now() })
    await addNote()
    onOpenChange(false)
  }

  const deleteButton = (key: string, what: string, remove: () => unknown): ReactNode => armed === key ? (
    <Button variant="destructive" className="-my-1 h-11 px-4" onClick={remove}>Delete</Button>
  ) : (
    <Button variant="ghost" size="icon" className="-my-1 size-11" aria-label={`Delete ${what}`} onClick={() => setArmed(key)}>
      <Trash2Icon />
    </Button>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <div className="grid flex-1 content-start gap-6 overflow-y-auto px-4 pt-2 pb-4">
          <div className="pr-12">
            <SheetTitle>{label}</SheetTitle>
            <SheetDescription>
              {checkins.length ? `Logged ${checkins.length} ${checkins.length === 1 ? 'time' : 'times'}` : 'Not logged'}
            </SheetDescription>
          </div>

          <section className="grid gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">Logs · {checkins.length}</h3>
            {checkins.length ? (
              <ol className="grid gap-2">
                {checkins.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 motion-safe:animate-in motion-safe:fade-in">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                      <CheckIcon aria-hidden className="size-4" />
                    </span>
                    <div className="flex-1 text-sm">
                      <div className="font-medium">Log {i + 1}</div>
                      <div className="text-muted-foreground tabular-nums">{when(c.createdAt)}</div>
                    </div>
                    {deleteButton(`log-${c.id}`, `log ${i + 1}`, () => db.checkins.delete(c.id))}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">Not logged yet. Tap Log it below.</p>
            )}
          </section>

          <section className="grid gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
            {notes.length ? (
              <ul className="grid gap-2">
                {notes.map((n) => (
                  <li key={n.key} className="flex items-start gap-3 rounded-xl bg-muted p-3 motion-safe:animate-in motion-safe:fade-in">
                    <div className="flex-1 text-sm">
                      <p className="whitespace-pre-line">{n.text}</p>
                      <div className="text-muted-foreground tabular-nums">{when(n.createdAt)}</div>
                    </div>
                    {deleteButton(n.key, 'note', n.remove)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            )}
          </section>
        </div>

        <div className="grid shrink-0 gap-3 border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <form onSubmit={addNote} className="flex items-end gap-2">
            <Label htmlFor="day-note" className="sr-only">New note</Label>
            <Textarea id="day-note" maxLength={280} className="max-h-28 min-h-11" placeholder={habit.prompt ?? 'Anything worth noting?'}
              value={draft} onChange={(e) => setDraft(e.target.value)} />
            <Button type="submit" variant="outline" className="h-11 shrink-0 px-4" disabled={!draft.trim()}>
              Add note
            </Button>
          </form>
          <Button size="lg" className="h-14 w-full rounded-xl text-base" onClick={logIt}>
            {checkins.length ? 'Log it again' : 'Log it'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

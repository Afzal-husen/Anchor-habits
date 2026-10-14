import { useEffect, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CheckIcon, StickyNoteIcon, Trash2Icon } from 'lucide-react'
import { db, type Habit } from '@/db'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'

type Entry = { kind: 'log' | 'note'; id: number; text?: string; createdAt: number }

// Parent remounts this with a new `key` per date, so the draft starts empty.
export function DaySheet({ habit, date, open, onOpenChange }: {
  habit: Habit
  date: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const data = useLiveQuery(async () => ({
    checkins: await db.checkins.where('habitId').equals(habit.id).filter((c) => c.date === date).toArray(),
    notes: await db.notes.where('habitId').equals(habit.id).filter((n) => n.date === date).toArray(),
  }), [habit.id, date])
  const [draft, setDraft] = useState('')
  // Delete takes two taps: the first arms the button for 3 seconds.
  const [armed, setArmed] = useState<string>()
  useEffect(() => {
    if (armed === undefined) return
    const t = setTimeout(() => setArmed(undefined), 3000)
    return () => clearTimeout(t)
  }, [armed])

  const logs = data?.checkins.length ?? 0
  const entries: Entry[] = [
    ...(data?.checkins ?? []).map((c) => ({ kind: 'log' as const, id: c.id, text: c.note, createdAt: c.createdAt })),
    ...(data?.notes ?? []).map((n) => ({ kind: 'note' as const, id: n.id, text: n.text, createdAt: n.createdAt })),
  ].sort((a, b) => a.createdAt - b.createdAt)
  const label = new Date(`${date}T00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  async function addNote(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    await db.notes.add({ habitId: habit.id, date, text: draft.trim(), createdAt: Date.now() })
    setDraft('')
  }

  async function logIt() {
    navigator.vibrate?.(30)
    await db.checkins.add({ habitId: habit.id, date, note: draft.trim() || undefined, createdAt: Date.now() })
    setDraft('')
    onOpenChange(false)
  }

  function remove(e: Entry) {
    return e.kind === 'log' ? db.checkins.delete(e.id) : db.notes.delete(e.id)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <div className="grid flex-1 content-start gap-5 overflow-y-auto px-4 pt-2 pb-4">
          <div className="pr-12">
            <SheetTitle>{label}</SheetTitle>
            <SheetDescription>
              {logs ? `Logged${logs > 1 ? ` ${logs} times` : ''}` : entries.length ? 'Not logged · has notes' : 'Not logged'}
            </SheetDescription>
          </div>

          <form onSubmit={addNote} className="grid gap-2">
            <Label htmlFor="day-note">Note (optional)</Label>
            <Textarea id="day-note" maxLength={280} placeholder={habit.prompt ?? 'Anything worth noting?'}
              value={draft} onChange={(e) => setDraft(e.target.value)} />
            <Button type="submit" variant="outline" className="h-11 justify-self-end px-4" disabled={!draft.trim()}>
              Add note
            </Button>
          </form>

          <section className="grid gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">On this day</h3>
            {entries.length ? (
              <ul className="grid gap-2">
                {entries.map((e) => {
                  const key = `${e.kind}-${e.id}`
                  const Icon = e.kind === 'log' ? CheckIcon : StickyNoteIcon
                  return (
                    <li key={key} className="flex items-start gap-3 rounded-xl border bg-card p-3 motion-safe:animate-in motion-safe:fade-in">
                      <Icon aria-hidden className={e.kind === 'log' ? 'mt-0.5 size-4 shrink-0 text-primary' : 'mt-0.5 size-4 shrink-0 text-muted-foreground'} />
                      <div className="flex-1 text-sm">
                        <div className="font-medium">{e.kind === 'log' ? 'Logged' : 'Note'}</div>
                        {e.text && <p className="break-words text-muted-foreground">{e.text}</p>}
                      </div>
                      {armed === key ? (
                        <Button variant="destructive" className="-my-1 h-11 px-4" onClick={() => remove(e)}>Delete</Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="-my-1 size-11"
                          aria-label={e.kind === 'log' ? 'Delete log' : 'Delete note'} onClick={() => setArmed(key)}>
                          <Trash2Icon />
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing yet.</p>
            )}
          </section>
        </div>

        <div className="shrink-0 border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button size="lg" className="h-14 w-full rounded-xl text-base" onClick={logIt}>
            {logs ? 'Log it again' : 'Log it'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CheckIcon } from 'lucide-react'
import { db, type Checkin, type Habit } from '@/db'
import { addDays, dateKey, daysBetween, weekStart } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

type Logged = { checkin: Checkin; habit: Habit }

const WELCOME_BACK_DAYS = 3

export function TodayScreen({ onPickHabits, onOpen }: { onPickHabits: () => void; onOpen: (id: number) => void }) {
  const [today, setToday] = useState(dateKey)
  // An installed PWA resumes from the background without re-rendering, so re-read the date.
  useEffect(() => {
    const sync = () => setToday(dateKey())
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  const yesterday = addDays(today, -1)
  const monday = weekStart(today)
  const since = monday < yesterday ? monday : yesterday
  const data = useLiveQuery(async () => ({
    habits: await db.habits.where('active').equals(1).toArray(),
    checkins: await db.checkins.where('date').aboveOrEqual(since).toArray(),
    lastDate: (await db.checkins.orderBy('date').last())?.date,
    total: await db.checkins.count(),
  }), [since])

  const [noting, setNoting] = useState<Logged>()
  const [toast, setToast] = useState<Logged>()
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(undefined), 5000)
    return () => clearTimeout(t)
  }, [toast])

  async function log(habit: Habit, date: string) {
    navigator.vibrate?.(30)
    const fields = { habitId: habit.id, date, createdAt: Date.now() }
    const id = await db.checkins.add(fields)
    setToast(undefined)
    setNoting({ checkin: { ...fields, id }, habit })
  }

  async function undo(id: number) {
    await db.checkins.delete(id)
    setNoting(undefined)
    setToast(undefined)
  }

  if (!data) return null

  if (!data.habits.length) {
    return (
      <div className="grid gap-3 rounded-2xl border p-6 text-center">
        <p>Nothing in focus yet.</p>
        <Button size="lg" className="h-11" onClick={onPickHabits}>Pick a habit</Button>
      </div>
    )
  }

  return (
    <>
      {data.lastDate && daysBetween(data.lastDate, today) >= WELCOME_BACK_DAYS && (
        <div className="rounded-2xl bg-muted p-4">
          <p className="font-medium">Welcome back.</p>
          <p className="text-sm text-muted-foreground">
            {data.total} {data.total === 1 ? 'session' : 'sessions'} so far, and every one still counts. Pick any habit below.
          </p>
        </div>
      )}
      <ul className="grid gap-3">
        {data.habits.map((h) => {
          const mine = data.checkins.filter((c) => c.habitId === h.id)
          const week = mine.filter((c) => c.date >= monday).length
          const doneToday = mine.filter((c) => c.date === today).length
          const progress = h.cadence.type === 'weekly'
            ? `${week} of ${h.cadence.n} this week${week >= h.cadence.n ? ' · target hit' : ''}`
            : `${week} this week`
          return (
            <li key={h.id} className="grid gap-3 rounded-2xl border p-4">
              <div>
                <button type="button" onClick={() => onOpen(h.id)} className="min-h-11 text-left">
                  <div className="text-lg font-medium">{h.name}</div>
                  <div className="text-sm text-muted-foreground">{progress}</div>
                </button>
              </div>
              <Button size="lg" variant={doneToday ? 'secondary' : 'default'} className="h-14 text-base"
                onClick={() => log(h, today)}>
                {doneToday ? (
                  <>
                    <CheckIcon key={doneToday} className="motion-safe:animate-in motion-safe:zoom-in-50" />
                    Done{doneToday > 1 ? ` ×${doneToday}` : ''} · log again
                  </>
                ) : 'Log it'}
              </Button>
              {mine.some((c) => c.date === yesterday) ? (
                <p className="text-sm text-muted-foreground">Yesterday logged</p>
              ) : (
                <Button variant="link" className="h-11 justify-self-start px-0 text-muted-foreground"
                  onClick={() => log(h, yesterday)}>
                  Did it yesterday
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      {noting && (
        <NoteDialog key={noting.checkin.id} logged={noting} yesterday={yesterday}
          onUndo={() => undo(noting.checkin.id)}
          onDone={() => { setNoting(undefined); setToast(noting) }} />
      )}

      <div role="status" aria-live="polite">
        {toast && (
          <div className="fixed inset-x-4 bottom-4 mx-auto flex max-w-md items-center justify-between rounded-xl bg-foreground py-1 pr-1 pl-4 text-background">
            <span>Logged {toast.habit.name}</span>
            <Button variant="ghost" className="h-11 px-4 text-background hover:bg-background/10 hover:text-background"
              onClick={() => undo(toast.checkin.id)}>
              Undo
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

function NoteDialog({ logged: { checkin, habit }, yesterday, onUndo, onDone }: {
  logged: Logged
  yesterday: string
  onUndo: () => void
  onDone: () => void
}) {
  const [note, setNote] = useState('')

  async function save(e: FormEvent) {
    e.preventDefault()
    await db.checkins.update(checkin.id, { note: note.trim() })
    onDone()
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onDone() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Logged {habit.name}{checkin.date === yesterday ? ' for yesterday' : ''}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-4">
          <Textarea aria-label="Note" maxLength={280} placeholder={habit.prompt ?? 'Anything worth noting?'}
            value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button type="button" variant="ghost" className="h-11" onClick={onUndo}>Undo</Button>
            <Button type="button" variant="outline" className="h-11" onClick={onDone}>Skip</Button>
            <Button type="submit" className="h-11" disabled={!note.trim()}>Save note</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

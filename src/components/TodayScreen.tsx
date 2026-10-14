import { useEffect, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnchorIcon, CheckIcon, ChevronRightIcon, TargetIcon } from 'lucide-react'
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

  const header = (
    <header>
      <p className="text-sm font-medium text-muted-foreground">
        {new Date(`${today}T00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
    </header>
  )

  if (!data) return header

  if (!data.habits.length) {
    return (
      <>
        {header}
        <div className="grid justify-items-center gap-4 rounded-2xl border bg-card p-8 text-center shadow-xs">
          <span className="grid size-14 place-items-center rounded-full bg-secondary text-secondary-foreground">
            <AnchorIcon aria-hidden className="size-7" />
          </span>
          <div className="grid gap-1">
            <p className="text-lg font-medium">Nothing in focus yet</p>
            <p className="text-sm text-muted-foreground">Pick one small habit to start. You can add more later.</p>
          </div>
          <Button size="lg" className="h-12 w-full text-base" onClick={onPickHabits}>Pick a habit</Button>
        </div>
      </>
    )
  }

  return (
    <>
      {header}
      {data.lastDate && daysBetween(data.lastDate, today) >= WELCOME_BACK_DAYS && (
        <div className="rounded-2xl bg-accent p-4 text-accent-foreground">
          <p className="font-medium">Welcome back.</p>
          <p className="text-sm">
            {data.total} {data.total === 1 ? 'session' : 'sessions'} so far, and every one still counts. Pick any habit below.
          </p>
        </div>
      )}
      <ul className="grid gap-3">
        {data.habits.map((h) => {
          const mine = data.checkins.filter((c) => c.habitId === h.id)
          const week = mine.filter((c) => c.date >= monday).length
          const doneToday = mine.filter((c) => c.date === today).length
          const target = h.cadence.type === 'weekly' ? h.cadence.n : undefined
          return (
            <li key={h.id} className="grid gap-3 rounded-2xl border bg-card p-4 shadow-xs">
              <button type="button" onClick={() => onOpen(h.id)}
                className="-m-2 flex min-h-11 cursor-pointer items-center gap-2 rounded-xl p-2 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                <div className="grid flex-1 gap-1.5">
                  <div className="text-lg font-medium">{h.name}</div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    {target !== undefined && (
                      <span aria-hidden className="flex gap-1">
                        {Array.from({ length: target }, (_, i) => (
                          <span key={i} className={i < week ? 'size-2.5 rounded-full bg-primary' : 'size-2.5 rounded-full bg-muted-foreground/30'} />
                        ))}
                      </span>
                    )}
                    <span>{target !== undefined ? `${week} of ${target} this week` : `${week} this week`}</span>
                    {target !== undefined && week >= target && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                        <TargetIcon aria-hidden className="size-3" />Target hit
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRightIcon aria-hidden className="size-5 text-muted-foreground" />
              </button>
              <Button size="lg" variant={doneToday ? 'secondary' : 'default'} className="h-14 rounded-xl text-base"
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
          <div className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-md items-center justify-between rounded-xl bg-foreground py-1 pr-1 pl-4 text-background shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
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

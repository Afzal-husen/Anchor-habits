import { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { addMonths, monthGrid } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function MonthCalendar({ dates, noteDates, today, onPick }: {
  dates: string[]
  noteDates: string[]
  today: string
  onPick: (date: string) => void
}) {
  const thisMonth = today.slice(0, 7)
  const [month, setMonth] = useState(thisMonth)
  const counts = new Map<string, number>()
  for (const d of dates) counts.set(d, (counts.get(d) ?? 0) + 1)
  const noted = new Set(noteDates)
  const inMonth = dates.filter((d) => d.startsWith(month)).length
  const label = new Date(`${month}-01T00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-xs">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="size-11" aria-label="Previous month"
          onClick={() => setMonth(addMonths(month, -1))}>
          <ChevronLeftIcon />
        </Button>
        <div className="flex-1 text-center" aria-live="polite">
          <div className="font-medium">{label}</div>
          <div className="text-sm text-muted-foreground">{inMonth} {inMonth === 1 ? 'session' : 'sessions'}</div>
        </div>
        <Button variant="ghost" size="icon" className="size-11" aria-label="Next month"
          disabled={month >= thisMonth} onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronRightIcon />
        </Button>
      </div>

      <ol className="grid grid-cols-7 gap-1 text-center text-sm">
        {WEEKDAYS.map((w) => (
          <li key={w} aria-hidden className="pb-1 text-xs font-medium text-muted-foreground">{w.slice(0, 1)}</li>
        ))}
        {monthGrid(month).map((d) => {
          if (!d.startsWith(month)) return <li key={d} aria-hidden />
          const n = counts.get(d) ?? 0
          const day = new Date(`${d}T00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
          const notesOnly = !n && noted.has(d)
          const cell = cn('relative grid aspect-square w-full place-items-center rounded-lg tabular-nums',
            n ? 'bg-primary font-semibold text-primary-foreground' : d > today ? 'text-muted-foreground/50' : 'text-muted-foreground',
            notesOnly && 'font-medium text-foreground',
            d === today && 'ring-2 ring-foreground ring-offset-2 ring-offset-card')
          return (
            <li key={d}>
              {d > today ? (
                <span className={cell}>{Number(d.slice(8))}</span>
              ) : (
                <button type="button" onClick={() => onPick(d)}
                  aria-label={`${day}: ${n ? `logged${n > 1 ? ` ${n} times` : ''}` : notesOnly ? 'not logged, has notes' : 'not logged'}`}
                  className={cn(cell, 'cursor-pointer transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                    n ? 'hover:bg-primary/85' : 'hover:bg-secondary hover:text-secondary-foreground')}>
                  {Number(d.slice(8))}
                  {notesOnly && <span aria-hidden className="absolute bottom-1 size-1.5 rounded-full bg-accent-foreground" />}
                </button>
              )}
            </li>
          )
        })}
      </ol>
      <p className="text-center text-sm text-muted-foreground">Tap a day to log it or add a note.</p>
    </div>
  )
}

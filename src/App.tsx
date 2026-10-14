import { useState } from 'react'
import { ListChecksIcon, SunIcon } from 'lucide-react'
import { HabitDetail } from '@/components/HabitDetail'
import { HabitsScreen } from '@/components/HabitsScreen'
import { BackupButton } from '@/components/BackupButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { TodayScreen } from '@/components/TodayScreen'
import { cn } from '@/lib/utils'

// shortcut: state-based views, so the Android back button exits the app; add a router if that annoys.
type Tab = 'today' | 'habits'

const TABS = [
  { id: 'today', label: 'Today', Icon: SunIcon },
  { id: 'habits', label: 'Habits', Icon: ListChecksIcon },
] as const

function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [habitId, setHabitId] = useState<number>()

  return (
    <>
      <main className="mx-auto grid min-h-svh max-w-md content-start gap-6 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {habitId !== undefined ? (
          <HabitDetail id={habitId} onBack={() => setHabitId(undefined)} />
        ) : tab === 'today' ? (
          <TodayScreen onPickHabits={() => setTab('habits')} onOpen={setHabitId} />
        ) : (
          <>
            <header className="flex items-center justify-between">
              <h1 className="text-3xl font-semibold tracking-tight">Habits</h1>
              <div className="flex gap-2">
                <BackupButton />
                <ThemeToggle />
              </div>
            </header>
            <HabitsScreen onOpen={setHabitId} />
          </>
        )}
      </main>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto grid max-w-md grid-cols-2">
          {TABS.map(({ id, label, Icon }) => {
            const current = tab === id && habitId === undefined
            return (
              <li key={id}>
                <button type="button" aria-current={current ? 'page' : undefined}
                  onClick={() => { setTab(id); setHabitId(undefined) }}
                  className={cn('flex h-16 w-full cursor-pointer flex-col items-center justify-center gap-1 text-xs font-medium transition-colors outline-none focus-visible:bg-muted',
                    current ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
                  <Icon aria-hidden className="size-6" strokeWidth={current ? 2.25 : 1.75} />
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}

export default App

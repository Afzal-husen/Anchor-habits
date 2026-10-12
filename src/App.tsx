import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { HabitDetail } from '@/components/HabitDetail'
import { HabitsScreen } from '@/components/HabitsScreen'
import { TodayScreen } from '@/components/TodayScreen'

// shortcut: state-based views, so the Android back button exits the app; add a router if that annoys.
type Tab = 'today' | 'habits'

function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [habitId, setHabitId] = useState<number>()

  return (
    <main className="mx-auto grid min-h-svh max-w-md content-start gap-6 p-4">
      {habitId !== undefined ? (
        <HabitDetail id={habitId} onBack={() => setHabitId(undefined)} />
      ) : (
        <>
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">{tab === 'today' ? 'Today' : 'Habits'}</h1>
            <Button variant="ghost" className="h-11 px-4" onClick={() => setTab(tab === 'today' ? 'habits' : 'today')}>
              {tab === 'today' ? 'Habits' : 'Today'}
            </Button>
          </header>
          {tab === 'today'
            ? <TodayScreen onPickHabits={() => setTab('habits')} onOpen={setHabitId} />
            : <HabitsScreen onOpen={setHabitId} />}
        </>
      )}
    </main>
  )
}

export default App

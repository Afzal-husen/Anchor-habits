import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { HabitsScreen } from '@/components/HabitsScreen'
import { TodayScreen } from '@/components/TodayScreen'

// shortcut: state-based views, so the Android back button exits the app; add a router if that annoys.
type View = 'today' | 'habits'

function App() {
  const [view, setView] = useState<View>('today')

  return (
    <main className="mx-auto grid min-h-svh max-w-md content-start gap-6 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{view === 'today' ? 'Today' : 'Habits'}</h1>
        <Button variant="ghost" className="h-11 px-4" onClick={() => setView(view === 'today' ? 'habits' : 'today')}>
          {view === 'today' ? 'Habits' : 'Today'}
        </Button>
      </header>
      {view === 'today' ? <TodayScreen onPickHabits={() => setView('habits')} /> : <HabitsScreen />}
    </main>
  )
}

export default App

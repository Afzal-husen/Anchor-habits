import { useState } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

declare global {
  interface Window {
    applyTheme(theme?: string): void // defined in index.html
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme)
  const dark = theme === 'dark'

  function toggle() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem('theme', next) } catch { /* storage blocked: choice lasts until reload */ }
    window.applyTheme(next)
    setTheme(next)
  }

  return (
    <Button variant="outline" size="icon" className="size-11 rounded-full" onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

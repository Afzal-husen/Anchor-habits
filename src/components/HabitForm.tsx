import { useState, type FormEvent } from 'react'
import { addHabit, db, type Cadence, type Habit } from '@/db'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const CADENCES = [
  { value: 'flexible', label: 'Flexible, no target' },
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: `${n}× per week` })),
]

// Parent remounts this with a new `key` per habit, so state starts fresh.
export function HabitForm({ habit, open, onOpenChange }: {
  habit?: Habit
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState(habit?.name ?? '')
  const [prompt, setPrompt] = useState(habit?.prompt ?? '')
  const [cadence, setCadence] = useState(
    habit?.cadence.type === 'weekly' ? String(habit.cadence.n) : 'flexible',
  )

  async function save(e: FormEvent) {
    e.preventDefault()
    const c: Cadence = cadence === 'flexible' ? { type: 'flexible' } : { type: 'weekly', n: Number(cadence) }
    const fields = { name: name.trim(), prompt: prompt.trim() || undefined, cadence: c }
    if (habit) await db.habits.update(habit.id, fields)
    else await addHabit(fields)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{habit ? 'Edit habit' : 'New habit'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="habit-name">What's the habit?</Label>
            <Input id="habit-name" required maxLength={60} autoFocus placeholder="Practice guitar"
              value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="habit-prompt">Reflection prompt (optional)</Label>
            <Input id="habit-prompt" maxLength={80} placeholder="What did you play?"
              value={prompt} onChange={(e) => setPrompt(e.target.value)} className="h-11" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="habit-cadence">How often?</Label>
            <Select items={CADENCES} value={cadence} onValueChange={(v) => setCadence(v ?? 'flexible')}>
              <SelectTrigger id="habit-cadence" className="h-11 w-full text-base md:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CADENCES.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="min-h-11">{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" size="lg" className="h-11 w-full">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

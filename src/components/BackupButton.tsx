import { useRef, useState, type ChangeEvent } from 'react'
import { DatabaseBackupIcon, DownloadIcon, UploadIcon } from 'lucide-react'
import { db, exportBackup, restoreBackup } from '@/db'
import { parseBackup, type Backup } from '@/lib/backup'
import { daysBetween, dateKey } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const REMIND_AFTER_DAYS = 14
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const longDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

function readLast(): number | undefined {
  try { return Number(localStorage.getItem('lastBackup')) || undefined } catch { return undefined }
}

export function BackupButton() {
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState(readLast)
  const [pending, setPending] = useState<{ backup: Backup; current: { habits: number; checkins: number; notes: number } }>()
  const [status, setStatus] = useState<string>()
  const file = useRef<HTMLInputElement>(null)
  const stale = !last || daysBetween(dateKey(new Date(last)), dateKey()) >= REMIND_AFTER_DAYS

  async function download() {
    const backup = await exportBackup()
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `anchor-habits-backup-${dateKey()}.json` })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    try { localStorage.setItem('lastBackup', String(backup.exportedAt)) } catch { /* storage blocked: reminder can't track it */ }
    setLast(backup.exportedAt)
    setStatus(`Backup downloaded: ${plural(backup.habits.length, 'habit')}, ${plural(backup.checkins.length, 'log')}.`)
  }

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = '' // so picking the same file again still fires
    if (!f) return
    try {
      const backup = parseBackup(await f.text())
      const current = { habits: await db.habits.count(), checkins: await db.checkins.count(), notes: await db.notes.count() }
      setStatus(undefined)
      setPending({ backup, current })
    } catch (err) {
      setStatus((err as Error).message)
    }
  }

  async function restore() {
    if (!pending) return
    await restoreBackup(pending.backup)
    try {
      // Drafts are keyed by habit id, which may now point at a different habit.
      for (const k of Object.keys(localStorage)) if (k.startsWith('draft:')) localStorage.removeItem(k)
    } catch { /* storage blocked: no drafts to clear */ }
    setStatus(`Restored ${plural(pending.backup.habits.length, 'habit')} and ${plural(pending.backup.checkins.length, 'log')}.`)
    setPending(undefined)
  }

  return (
    <>
      <Button variant="outline" size="icon" className="relative size-11 rounded-full" onClick={() => { setStatus(undefined); setOpen(true) }}
        aria-label={stale ? 'Backup (backup recommended)' : 'Backup'}>
        <DatabaseBackupIcon />
        {stale && <span aria-hidden className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-accent-foreground ring-2 ring-background" />}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-3">
          <DialogHeader>
            <DialogTitle>Backup</DialogTitle>
            <DialogDescription>
              Your history lives only on this device. Save a backup file somewhere safe, like iCloud Drive, Google Drive or email.
            </DialogDescription>
          </DialogHeader>
          <p className={stale ? 'rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground' : 'text-sm text-muted-foreground'}>
            {last ? `Last backup: ${longDate(last)}.` : 'No backup yet.'}
            {stale && ' Download a fresh one so your progress is safe.'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button className="h-11" onClick={download}><DownloadIcon aria-hidden />Download</Button>
            <Button variant="outline" className="h-11" onClick={() => file.current?.click()}><UploadIcon aria-hidden />Restore</Button>
          </div>
          <input ref={file} type="file" accept=".json,application/json" className="hidden" onChange={pick} />
          <p role="status" className="text-sm text-muted-foreground empty:hidden">{status}</p>

          <Dialog open={!!pending} onOpenChange={(o) => { if (!o) setPending(undefined) }}>
            {pending && (
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Restore backup{pending.backup.exportedAt ? ` from ${longDate(pending.backup.exportedAt)}` : ''}?
                  </DialogTitle>
                  <DialogDescription>
                    This replaces everything in the app ({plural(pending.current.habits, 'habit')}, {plural(pending.current.checkins, 'log')},{' '}
                    {plural(pending.current.notes, 'note')}) with the backup's {plural(pending.backup.habits.length, 'habit')},{' '}
                    {plural(pending.backup.checkins.length, 'log')} and {plural(pending.backup.notes.length, 'note')}. You can't undo this.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" className="h-11" />}>Cancel</DialogClose>
                  <Button variant="destructive" className="h-11" onClick={restore}>Replace with backup</Button>
                </DialogFooter>
              </DialogContent>
            )}
          </Dialog>
        </DialogContent>
      </Dialog>
    </>
  )
}

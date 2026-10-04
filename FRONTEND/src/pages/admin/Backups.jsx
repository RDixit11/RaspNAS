import { ArchiveRestore, Play, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import ScheduleDialog from '@/components/backups/ScheduleDialog'
import ConfirmDialog from '@/components/ConfirmDialog'
import ErrorAlert from '@/components/ErrorAlert'
import FormError from '@/components/FormError'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { useCluster } from '@/hooks/useCluster'
import { useResource } from '@/hooks/useResource'
import { formatBytes, formatRelative } from '@/lib/format'
import { DAILY, isDaily, scheduleLabel } from '@/lib/schedule'
import { createBackup, deleteBackup, listBackups, runBackup } from '@/services/backups'
import { listShares } from '@/services/shares'

const USB = 'usb'

function NewBackupDialog({ shares, nodes, onSave }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [selected, setSelected] = useState([])
  const [destination, setDestination] = useState(USB)
  const [schedule, setSchedule] = useState(DAILY) // null — tylko ręcznie
  const [custom, setCustom] = useState(null) // własny harmonogram z okna „Więcej…”
  const [editingSchedule, setEditingSchedule] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleOpenChange = (value) => {
    setOpen(value)
    if (value) {
      setName('')
      setSelected([])
      setDestination(USB)
      setSchedule(DAILY)
      setCustom(null)
      setError('')
    }
  }

  const scheduleMode = schedule === null ? 'manual' : isDaily(schedule) ? 'daily' : 'custom'
  const chooseSchedule = (mode) => {
    if (mode === 'manual') setSchedule(null)
    else if (mode === 'daily') setSchedule(DAILY)
    else if (mode === 'custom') setSchedule(custom)
    // „Więcej…” — wartość zmieni się dopiero po zapisaniu okna. Inne wartości (np. pusta, którą wysyła
    // ukryty <select> Radixa w formularzu przy zmianie listy opcji) pomijamy.
    else if (mode === 'more') setEditingSchedule(true)
  }
  const saveCustom = (value) => {
    setSchedule(value)
    if (!isDaily(value)) setCustom(value)
  }

  const toggle = (shareId, checked) => setSelected((previous) => (checked ? [...previous, shareId] : previous.filter((x) => x !== shareId)))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave({ name, shareIds: selected, destination, schedule })
      setOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Nowa kopia
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <DialogHeader>
            <DialogTitle>Nowa kopia zapasowa</DialogTitle>
            <DialogDescription>Kopia chroni dane przed awarią dysku i przed ransomware — trzymaj ją na innym urządzeniu.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`${id}-name`}>Nazwa</Label>
            <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="np. Księgowość co noc" required autoFocus />
          </div>
          <fieldset className="min-w-0 space-y-2">
            <legend className="mb-2 text-sm font-medium">Udziały</legend>
            <ul className="max-h-44 divide-y overflow-y-auto rounded-lg border">
              {shares.map((share) => (
                <li key={share.id}>
                  <label htmlFor={`${id}-${share.id}`} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm pointer-coarse:py-3">
                    <Checkbox id={`${id}-${share.id}`} checked={selected.includes(share.id)} onCheckedChange={(checked) => toggle(share.id, checked === true)} />
                    <span className="min-w-0 flex-1 truncate">{share.name}</span>
                    <span className="text-xs text-muted-foreground">{formatBytes(share.usedBytes)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="grid grid-cols-1 gap-4">
            <div className="min-w-0 space-y-2">
              <Label htmlFor={`${id}-destination`}>Gdzie zapisać</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger id={`${id}-destination`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={USB}>Dysk USB koordynatora</SelectItem>
                  {nodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      Węzeł {node.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor={`${id}-schedule`}>Kiedy</Label>
              <Select value={scheduleMode} onValueChange={chooseSchedule}>
                <SelectTrigger id={`${id}-schedule`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="manual">Tylko ręcznie</SelectItem>
                  <SelectItem value="daily">{scheduleLabel(DAILY)}</SelectItem>
                  {custom && <SelectItem value="custom">{scheduleLabel(custom)}</SelectItem>}
                  <SelectItem value="more">
                    <SlidersHorizontal /> Więcej…
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <FormError>{error}</FormError>
          <DialogFooter>
            <Button type="submit" disabled={saving || !selected.length}>
              {saving ? 'Tworzenie…' : 'Utwórz kopię'}
            </Button>
          </DialogFooter>
        </form>
        <ScheduleDialog open={editingSchedule} onOpenChange={setEditingSchedule} value={schedule ?? custom ?? DAILY} onSave={saveCustom} />
      </DialogContent>
    </Dialog>
  )
}

function LastRun({ job }) {
  if (job.running) {
    const percent = Math.round((job.progress ?? 0) * 100)
    return (
      <div role="status" className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="flex items-center gap-1.5">
            <Spinner className="size-3.5" /> Trwa kopiowanie…
          </span>
          <span className="tabular-nums">{percent}%</span>
        </div>
        <Progress value={percent} aria-label={`Postęp kopii ${job.name}`} />
      </div>
    )
  }
  if (!job.lastStatus) return <p className="text-sm text-muted-foreground">Jeszcze nie uruchamiana.</p>
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm">
      {job.lastStatus === 'success' ? <StatusBadge tone="ok">Udana</StatusBadge> : <StatusBadge tone="error">Nieudana</StatusBadge>}
      <span className="text-muted-foreground">
        {formatRelative(job.lastRunAt)}
        {job.lastStatus === 'success' ? ` · ${formatBytes(job.lastSizeBytes)}` : ` · ${job.lastMessage}`}
      </span>
    </p>
  )
}

export default function Backups() {
  const cluster = useCluster()
  // gdy kopia trwa — odświeżanie co sekundę, żeby pasek postępu był płynny
  const backups = useResource(listBackups, [], { interval: (jobs) => (jobs?.some((job) => job.running) ? 1_000 : 10_000) })
  const shares = useResource(listShares)
  const [error, setError] = useState(null)

  const nodes = cluster.data.nodes.items
  const shareName = (shareId) => shares.data?.find((share) => share.id === shareId)?.name ?? '—'
  const destinationName = (destination) =>
    destination === USB ? 'Dysk USB koordynatora' : `węzeł ${nodes.find((node) => node.id === destination)?.name ?? 'usunięty'}`

  const run = async (action) => {
    setError(null)
    try {
      await action()
      backups.reload()
      cluster.reload()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <PageHeader title="Kopie zapasowe" description="Kopie udziałów na dysk USB albo na inny węzeł. Kopia obciąża dyski i procesor — planuj ją poza godzinami pracy.">
        {shares.data && <NewBackupDialog shares={shares.data} nodes={nodes} onSave={(job) => createBackup(job).then(backups.reload)} />}
      </PageHeader>

      <ErrorAlert error={error ?? backups.error} onClose={error ? () => setError(null) : undefined} className="mb-6" />
      {backups.loading && <Spinner className="mx-auto my-16 size-6 text-muted-foreground" />}
      {backups.data?.length === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ArchiveRestore />
            </EmptyMedia>
            <EmptyTitle>Nie masz żadnej kopii zapasowej</EmptyTitle>
            <EmptyDescription>Utwórz pierwszą — bez kopii awaria dysku albo ransomware oznacza utratę danych.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {backups.data?.map((job) => (
          <Card key={job.id}>
            <CardHeader>
              <CardTitle className="truncate">{job.name}</CardTitle>
              <CardDescription>
                {job.shareIds.map(shareName).join(', ') || 'Brak udziałów'} → {destinationName(job.destination)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{scheduleLabel(job.schedule)}</p>
              <LastRun job={job} />
            </CardContent>
            <CardFooter className="gap-2">
              <Button size="sm" onClick={() => run(() => runBackup(job.id))} disabled={job.running || !job.shareIds.length}>
                <Play /> Uruchom teraz
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="sm" className="ml-auto text-destructive" disabled={job.running}>
                    <Trash2 /> Usuń
                  </Button>
                }
                title={`Usunąć kopię „${job.name}”?`}
                description="Zadanie przestanie się wykonywać. Wcześniej zapisane kopie zostają na nośniku docelowym."
                onConfirm={() => run(() => deleteBackup(job.id))}
              />
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  )
}

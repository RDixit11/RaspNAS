import { Cpu, KeyRound, X } from 'lucide-react'
import { useState } from 'react'
import ConfirmDialog from '@/components/ConfirmDialog'
import ErrorAlert from '@/components/ErrorAlert'
import FormError from '@/components/FormError'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { formatRelative } from '@/lib/format'
import { plural } from '@/lib/plural'
import { approveJoinRequest, rejectJoinRequest } from '@/services/cluster'

function ApproveDialog({ request, onApproved }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleOpenChange = (value) => {
    setOpen(value)
    if (!value) {
      setCode('')
      setError(null)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const node = await approveJoinRequest(request.id, code)
      handleOpenChange(false)
      onApproved(node)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <KeyRound /> Zatwierdź
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <DialogHeader>
            <DialogTitle>Dołącz {request.hostname} do klastra</DialogTitle>
            <DialogDescription>
              Wpisz kod parowania wyświetlany przez agenta na urządzeniu {request.ip}. Dzięki temu do klastra nie dołączy
              obce urządzenie.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="join-code">Kod parowania</Label>
            <Input
              id="join-code"
              placeholder="ABC-123"
              autoComplete="off"
              className="font-mono uppercase tracking-widest"
              maxLength={16}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
            />
            {request.simulatedCode && (
              <p className="text-xs text-muted-foreground">
                Symulacja — kod na ekranie urządzenia: <span className="font-mono text-foreground">{request.simulatedCode}</span>
              </p>
            )}
          </div>
          {error?.status === 504 ? <ErrorAlert error={error} title="Węzeł nie odpowiada" /> : <FormError>{error?.message}</FormError>}
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner />}
              {saving ? 'Łączenie z węzłem…' : 'Dołącz węzeł'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function JoinRequests({ requests, onChanged, onApproved }) {
  const [error, setError] = useState(null)

  const reject = async (request) => {
    setError(null)
    try {
      await rejectJoinRequest(request.id)
      onChanged()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nowe urządzenia chcą dołączyć</CardTitle>
        <CardDescription>Agenci zgłosili się do koordynatora i czekają na zatwierdzenie kodem parowania.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ErrorAlert error={error} onClose={() => setError(null)} />
        <ul className="-my-3 divide-y">
          {requests.map((request) => (
            <li key={request.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Cpu className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{request.hostname}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{request.ip}</span> · {request.model} ·{' '}
                  {plural(request.bays, ['kieszeń', 'kieszenie', 'kieszeni'])} na dyski · {formatRelative(request.requestedAt)}
                </p>
              </div>
              <div className="flex gap-1">
                <ApproveDialog request={request} onApproved={onApproved} />
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label={`Odrzuć ${request.hostname}`}>
                      <X />
                    </Button>
                  }
                  title={`Odrzucić ${request.hostname}?`}
                  description={`Urządzenie ${request.ip} nie dołączy do klastra. Agent może zgłosić się ponownie.`}
                  confirmLabel="Odrzuć"
                  onConfirm={() => reject(request)}
                />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

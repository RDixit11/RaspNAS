import { useId, useState } from 'react'
import FormError from '@/components/FormError'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const EMPTY = { name: '', description: '', smb: true, nfs: false }

function ProtocolSwitch({ id, label, hint, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

// Tworzenie albo edycja udziału — `share` podany = edycja
export default function ShareFormDialog({ share, trigger, onSave }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (field) => (value) => setForm((previous) => ({ ...previous, [field]: value }))

  const handleOpenChange = (value) => {
    setOpen(value)
    if (value) {
      setForm(share ? { name: share.name, description: share.description, smb: share.smb, nfs: share.nfs } : EMPTY)
      setError('')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave(form)
      setOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <DialogHeader>
            <DialogTitle>{share ? `Edytuj udział ${share.name}` : 'Nowy udział'}</DialogTitle>
            <DialogDescription>
              Udział to główny folder systemu plików. Dostęp do niego nadajesz osobno w „Uprawnieniach”.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`${id}-name`}>Nazwa</Label>
            <Input id={`${id}-name`} value={form.name} onChange={(e) => set('name')(e.target.value)} maxLength={40} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-description`}>Opis (opcjonalnie)</Label>
            <Input
              id={`${id}-description`}
              value={form.description}
              onChange={(e) => set('description')(e.target.value)}
              maxLength={120}
              placeholder="np. Dokumenty działu kadr"
            />
          </div>
          <ProtocolSwitch id={`${id}-smb`} label="SMB" hint="Dysk sieciowy w Windows i macOS" checked={form.smb} onChange={set('smb')} />
          <ProtocolSwitch
            id={`${id}-nfs`}
            label="NFS (v4)"
            hint="Montowanie w Linuksie — tylko wersja 4, starsze są wyłączone ze względów bezpieczeństwa"
            checked={form.nfs}
            onChange={set('nfs')}
          />
          <FormError>{error}</FormError>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? 'Zapisywanie…' : share ? 'Zapisz' : 'Utwórz udział'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

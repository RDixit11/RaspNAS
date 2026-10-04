import { Pencil } from 'lucide-react'
import { useId, useState } from 'react'
import FormError from '@/components/FormError'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Ikona ołówka + okno ze zmianą nazwy (sieci, urządzenia, NAS)
export default function RenameDialog({
  title,
  description,
  initialName,
  placeholder,
  hint,
  maxLength = 40,
  required = true,
  triggerLabel,
  onSave,
}) {
  const inputId = useId()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleOpenChange = (value) => {
    setOpen(value)
    if (value) {
      setName(initialName)
      setError('')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave(name.trim())
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
        <Button variant="ghost" size="icon-sm" aria-label={triggerLabel} title={triggerLabel}>
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={inputId}>Nazwa{!required && ' (opcjonalnie)'}</Label>
            <Input
              id={inputId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={placeholder}
              maxLength={maxLength}
              required={required}
              autoFocus
            />
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
          <FormError>{error}</FormError>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={saving || (required && !name.trim())}>
              {saving ? 'Zapisywanie…' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

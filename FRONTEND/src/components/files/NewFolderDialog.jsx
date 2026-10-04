import { FolderPlus } from 'lucide-react'
import { useState } from 'react'
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

export default function NewFolderDialog({ onCreate }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleOpenChange = (value) => {
    setOpen(value)
    if (!value) {
      setName('')
      setError('')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onCreate(name)
      handleOpenChange(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FolderPlus /> Nowy folder
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <DialogHeader>
            <DialogTitle>Nowy folder</DialogTitle>
            <DialogDescription>Folder pojawi się na wszystkich węzłach NAS.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="folder-name">Nazwa</Label>
            <Input id="folder-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} required />
          </div>
          <FormError>{error}</FormError>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? 'Tworzenie…' : 'Utwórz'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

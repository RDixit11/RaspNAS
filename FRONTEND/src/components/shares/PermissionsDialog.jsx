import { ShieldCheck, UserRound } from 'lucide-react'
import { useState } from 'react'
import FormError from '@/components/FormError'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { listUsers } from '@/services/users'

const NONE = 'none'
const OPTIONS = [
  { value: NONE, label: 'Brak dostępu' },
  { value: 'read', label: 'Tylko odczyt' },
  { value: 'write', label: 'Odczyt i zapis' },
]

// Uprawnienia zwykłych użytkowników do udziału — administratorzy mają pełny dostęp zawsze
export default function PermissionsDialog({ share, onSave }) {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState(null)
  const [permissions, setPermissions] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleOpenChange = async (value) => {
    setOpen(value)
    if (!value) return
    setError('')
    setPermissions(share.permissions ?? {})
    try {
      setUsers(await listUsers())
    } catch (err) {
      setError(err.message)
    }
  }

  const change = (userId, value) =>
    setPermissions((previous) => {
      const next = { ...previous }
      if (value === NONE) delete next[userId]
      else next[userId] = value
      return next
    })

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      await onSave(permissions)
      setOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const regular = users?.filter((user) => user.role === 'user') ?? []
  const admins = users?.filter((user) => user.role === 'admin') ?? []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ShieldCheck /> Uprawnienia
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Uprawnienia: {share.name}</DialogTitle>
          <DialogDescription>
            {admins.length > 0 && `Administratorzy (${admins.map((u) => u.username).join(', ')}) mają pełny dostęp zawsze. `}
            Użytkownik bez dostępu nie widzi tego udziału.
          </DialogDescription>
        </DialogHeader>
        {!users && !error && <Spinner className="mx-auto my-6 size-5 text-muted-foreground" />}
        {users && regular.length === 0 && (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Nie ma jeszcze zwykłych użytkowników.</p>
        )}
        {regular.length > 0 && (
          <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border">
            {regular.map((user) => (
              <li key={user.id} className="flex items-center gap-3 px-3 py-2">
                <UserRound className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {user.username}
                  {!user.active && <span className="font-normal text-muted-foreground"> (zablokowane)</span>}
                </span>
                <Select value={permissions[user.id] ?? NONE} onValueChange={(value) => change(user.id, value)}>
                  <SelectTrigger size="sm" aria-label={`Dostęp ${user.username}`} className="w-40 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" align="end">
                    {OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </li>
            ))}
          </ul>
        )}
        <FormError>{error}</FormError>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={saving || !users}>
            {saving ? 'Zapisywanie…' : 'Zapisz uprawnienia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

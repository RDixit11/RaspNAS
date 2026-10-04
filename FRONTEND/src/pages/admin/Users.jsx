import { KeyRound, Lock, LockOpen, MoreHorizontal, Plus, Trash2, UserCog, UserRound } from 'lucide-react'
import { useId, useState } from 'react'
import ErrorAlert from '@/components/ErrorAlert'
import FormError from '@/components/FormError'
import PageHeader from '@/components/PageHeader'
import PasswordInput from '@/components/PasswordInput'
import StatusBadge from '@/components/StatusBadge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/hooks/useAuth'
import { useResource } from '@/hooks/useResource'
import { formatRelative } from '@/lib/format'
import { ROLE } from '@/lib/labels'
import { plural } from '@/lib/plural'
import { createUser, deleteUser, listUsers, updateUser } from '@/services/users'

function UserFormDialog({ open, onOpenChange, onSave }) {
  const id = useId()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const close = (value) => {
    onOpenChange(value)
    if (!value) {
      setUsername('')
      setPassword('')
      setRole('user')
      setError('')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave({ username, password, role })
      close(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <DialogHeader>
            <DialogTitle>Nowy użytkownik</DialogTitle>
            <DialogDescription>Dostęp do udziałów nadasz potem w sekcji Udziały → Uprawnienia.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`${id}-username`}>Nazwa użytkownika</Label>
            <Input id={`${id}-username`} autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
            <p className="text-xs text-muted-foreground">3–32 znaki: litery, cyfry, kropka, myślnik, podkreślnik.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-password`}>Hasło początkowe</Label>
            <PasswordInput id={`${id}-password`} autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <p className="text-xs text-muted-foreground">Co najmniej 6 znaków. Użytkownik może je potem zmienić w swoim koncie.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-role`}>Rola</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id={`${id}-role`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="user">Użytkownik — dostęp do wybranych udziałów</SelectItem>
                <SelectItem value="admin">Administrator — pełny dostęp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <FormError>{error}</FormError>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? 'Tworzenie…' : 'Utwórz konto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PasswordDialog({ user, onOpenChange, onSave }) {
  const id = useId()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave(password)
      onOpenChange(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(user)} onOpenChange={onOpenChange}>
      <DialogContent>
        {user && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <DialogHeader>
              <DialogTitle>Nowe hasło dla {user.username}</DialogTitle>
              <DialogDescription>Przekaż je użytkownikowi bezpiecznym kanałem.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor={`${id}-password`}>Nowe hasło</Label>
              <PasswordInput id={`${id}-password`} autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
            </div>
            <FormError>{error}</FormError>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? 'Zapisywanie…' : 'Ustaw hasło'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Potwierdzenie akcji wybranej z menu (menu zamyka się, więc okno jest sterowane stanem strony)
function Confirm({ confirm, onClose }) {
  return (
    <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        {confirm && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={confirm.action}>
                {confirm.label}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function Users() {
  const { user: me } = useAuth()
  const users = useResource(listUsers)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [passwordFor, setPasswordFor] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const run = async (action) => {
    setError(null)
    try {
      await action()
      users.reload()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <PageHeader title="Użytkownicy" description="Konta z dostępem do serwera. Administrator ma pełny dostęp, zwykły użytkownik — tylko do udziałów, które mu nadasz.">
        <Button onClick={() => setCreating(true)}>
          <Plus /> Nowy użytkownik
        </Button>
      </PageHeader>

      <ErrorAlert error={error ?? users.error} onClose={error ? () => setError(null) : undefined} className="mb-6" />
      {users.loading && <Spinner className="mx-auto my-16 size-6 text-muted-foreground" />}

      {users.data && (
        <Card>
          <CardContent>
            <ul className="-my-3 divide-y">
              {users.data.map((user) => {
                const isMe = user.id === me.id
                return (
                  <li key={user.id} className="flex items-center gap-3 py-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary uppercase">
                      {user.username.slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate font-medium">{user.username}</span>
                        {isMe && <Badge variant="outline">to Ty</Badge>}
                        <StatusBadge tone={user.role === 'admin' ? 'info' : 'off'}>{ROLE[user.role]}</StatusBadge>
                        {!user.active && <StatusBadge tone="error">Zablokowane</StatusBadge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.lastLoginAt ? `Ostatnie logowanie ${formatRelative(user.lastLoginAt)}` : 'Jeszcze się nie logował(a)'} ·{' '}
                        {user.role === 'admin' ? 'wszystkie udziały' : plural(user.shares, ['udział', 'udziały', 'udziałów'])}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Akcje dla ${user.username}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-56">
                        <DropdownMenuItem
                          disabled={isMe}
                          onSelect={() => run(() => updateUser(user.id, { role: user.role === 'admin' ? 'user' : 'admin' }))}
                        >
                          {user.role === 'admin' ? <UserRound /> : <UserCog />}
                          {user.role === 'admin' ? 'Zmień na zwykłego użytkownika' : 'Nadaj rolę administratora'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setPasswordFor(user)}>
                          <KeyRound /> Ustaw nowe hasło
                        </DropdownMenuItem>
                        {user.active ? (
                          <DropdownMenuItem
                            disabled={isMe}
                            onSelect={() =>
                              setConfirm({
                                title: `Zablokować konto ${user.username}?`,
                                description: 'Użytkownik zostanie wylogowany i nie zaloguje się, dopóki go nie odblokujesz.',
                                label: 'Zablokuj',
                                action: () => run(() => updateUser(user.id, { active: false })),
                              })
                            }
                          >
                            <Lock /> Zablokuj konto
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => run(() => updateUser(user.id, { active: true }))}>
                            <LockOpen /> Odblokuj konto
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={isMe}
                          onSelect={() =>
                            setConfirm({
                              title: `Usunąć konto ${user.username}?`,
                              description: 'Konto i jego uprawnienia do udziałów zostaną usunięte. Pliki w udziałach zostają.',
                              label: 'Usuń konto',
                              action: () => run(() => deleteUser(user.id)),
                            })
                          }
                        >
                          <Trash2 /> Usuń konto
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <UserFormDialog open={creating} onOpenChange={setCreating} onSave={(data) => createUser(data).then(users.reload)} />
      <PasswordDialog
        user={passwordFor}
        onOpenChange={(open) => !open && setPasswordFor(null)}
        onSave={(password) => updateUser(passwordFor.id, { password })}
      />
      <Confirm confirm={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}

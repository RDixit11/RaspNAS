import { useId, useState } from 'react'
import FormError from '@/components/FormError'
import PageHeader from '@/components/PageHeader'
import PasswordInput from '@/components/PasswordInput'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/hooks/useAuth'
import { ROLE } from '@/lib/labels'
import { setConfirmMove, shouldConfirmMove } from '@/lib/preferences'
import { changePassword } from '@/services/account'

function PasswordCard() {
  const id = useId()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setDone(false)
    if (next !== repeat) return setError('Nowe hasła nie są takie same.')
    setSaving(true)
    try {
      await changePassword(current, next)
      setCurrent('')
      setNext('')
      setRepeat('')
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="contents">
        <CardHeader>
          <CardTitle>Hasło</CardTitle>
          <CardDescription>Co najmniej 6 znaków.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${id}-current`}>Obecne hasło</Label>
            <PasswordInput id={`${id}-current`} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-next`}>Nowe hasło</Label>
            <PasswordInput id={`${id}-next`} autoComplete="new-password" minLength={6} value={next} onChange={(e) => setNext(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-repeat`}>Powtórz nowe hasło</Label>
            <PasswordInput id={`${id}-repeat`} autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
          </div>
          <FormError>{error}</FormError>
          {done && <p className="text-sm text-emerald-700 dark:text-emerald-400">Hasło zostało zmienione.</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={saving}>
            {saving ? 'Zapisywanie…' : 'Zmień hasło'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

// Zapisywane w tej przeglądarce — tu można przywrócić pytanie wyłączone przez „Nie pytaj ponownie”
function FilesCard() {
  const id = useId()
  const [confirmMove, setConfirm] = useState(shouldConfirmMove)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Menedżer plików</CardTitle>
        <CardDescription>Ustawienie zapisane w tej przeglądarce.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor={`${id}-confirm-move`} className="leading-snug font-normal">
            Pytaj przed przeniesieniem przeciągniętego pliku
          </Label>
          <Switch
            id={`${id}-confirm-move`}
            checked={confirmMove}
            onCheckedChange={(checked) => {
              setConfirmMove(checked)
              setConfirm(checked)
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function TwoFactorCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Weryfikacja dwuetapowa <StatusBadge tone="off">Wkrótce</StatusBadge>
        </CardTitle>
      </CardHeader>
    </Card>
  )
}

export default function Account() {
  const { user } = useAuth()
  return (
    <>
      <PageHeader title="Konto i bezpieczeństwo" description={`${user.username} · ${ROLE[user.role]}`} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PasswordCard />
        <div className="grid grid-cols-1 content-start gap-6">
          <TwoFactorCard />
          <FilesCard />
        </div>
      </div>
    </>
  )
}

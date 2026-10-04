import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import FormError from '@/components/FormError'
import Logo from '@/components/Logo'
import PasswordInput from '@/components/PasswordInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'

function LoginForm({ onDone }) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login({ username, password })
      onDone()
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="contents">
      <CardHeader>
        <CardTitle className="text-lg">Zaloguj się</CardTitle>
        <CardDescription>Panel serwera NAS. Konto zakłada administrator.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Nazwa użytkownika</Label>
          <Input id="username" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Hasło</Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <FormError>{error}</FormError>
      </CardContent>
      <CardFooter>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Logowanie…' : 'Zaloguj'}
        </Button>
      </CardFooter>
    </form>
  )
}

export default function Login() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const redirectTo = location.state?.from?.pathname ?? '/'
  if (user) return <Navigate to={redirectTo} replace />

  const done = () => navigate(redirectTo, { replace: true })

  return (
    <div className="w-full max-w-sm">
      <Logo className="mb-6 justify-center text-lg sm:text-xl" />
      <Card>
        <LoginForm onDone={done} />
      </Card>
    </div>
  )
}

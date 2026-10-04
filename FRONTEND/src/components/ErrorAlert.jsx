import { CircleAlert, X } from 'lucide-react'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Tytuł dobrany do kodu odpowiedzi API (ApiError.status)
const TITLES = {
  0: 'Brak połączenia z serwerem',
  403: 'Brak dostępu',
  404: 'Nie znaleziono',
  503: 'Węzeł niedostępny',
  504: 'Brak odpowiedzi',
  507: 'Brak miejsca',
}

export default function ErrorAlert({ error, title, onClose, className }) {
  if (!error) return null

  return (
    <Alert variant="destructive" className={cn(onClose && 'has-data-[slot=alert-action]:pr-10', className)}>
      <CircleAlert />
      <AlertTitle>{title ?? TITLES[error.status] ?? 'Coś poszło nie tak'}</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
      {onClose && (
        <AlertAction>
          <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="Zamknij komunikat">
            <X />
          </Button>
        </AlertAction>
      )}
    </Alert>
  )
}

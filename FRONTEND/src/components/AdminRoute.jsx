import { ShieldAlert } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useAuth } from '@/hooks/useAuth'

// Sekcje administracyjne — zwykły użytkownik dostaje czytelny komunikat zamiast pustej strony
export default function AdminRoute() {
  const { isAdmin } = useAuth()
  if (isAdmin) return <Outlet />
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShieldAlert />
        </EmptyMedia>
        <EmptyTitle>Brak dostępu</EmptyTitle>
        <EmptyDescription>Ta sekcja jest dostępna tylko dla administratora.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to="/">Wróć do przeglądu</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

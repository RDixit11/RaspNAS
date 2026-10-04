import { Outlet } from 'react-router-dom'
import ModeToggle from '@/components/theme/ModeToggle'

export default function AuthLayout() {
  return (
    // flex zamiast grid — długie słowo (nazwa aplikacji) nie rozpycha wtedy kolumny poza ekran telefonu
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-muted/40 px-4 py-16">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <Outlet />
    </div>
  )
}

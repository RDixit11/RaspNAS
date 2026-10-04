import { HardDrive } from 'lucide-react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '@/config'
import { cn } from '@/lib/utils'

export default function Logo({ className }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2 font-semibold', className)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <HardDrive className="size-4" />
      </span>
      <span className="truncate">{APP_NAME}</span>
    </Link>
  )
}

import { cn } from '@/lib/utils'

export default function UsageBar({ used, capacity, className }) {
  const percent = capacity ? Math.min(100, (used / capacity) * 100) : 0

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className={cn('h-full rounded-full', percent >= 99 ? 'bg-destructive' : percent >= 90 ? 'bg-amber-500' : 'bg-primary')}
        style={{ width: `${used ? Math.max(percent, 2) : 0}%` }}
      />
    </div>
  )
}

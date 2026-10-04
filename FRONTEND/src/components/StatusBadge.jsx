import { Badge } from '@/components/ui/badge'
import { TONE_BADGE, TONE_DOT } from '@/lib/labels'
import { cn } from '@/lib/utils'

export function StatusDot({ tone, className }) {
  return <span aria-hidden className={cn('inline-block size-2.5 shrink-0 rounded-full', TONE_DOT[tone], className)} />
}

// Plakietka stanu z kolorową kropką, np. „● Działa”
export default function StatusBadge({ tone, children, className }) {
  return (
    <Badge className={cn('gap-1.5', TONE_BADGE[tone], className)}>
      <StatusDot tone={tone} className="size-1.5" />
      {children}
    </Badge>
  )
}

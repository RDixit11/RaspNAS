import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Pagination({ page, pageSize, total, onChange }) {
  const pageCount = Math.ceil(total / pageSize)
  if (pageCount <= 1) return null

  const from = page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)

  return (
    <nav aria-label="Strony" className="flex items-center justify-between gap-2 border-t pt-3 text-sm">
      <span className="text-muted-foreground tabular-nums">
        {from}–{to} z {total}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => onChange(page - 1)} disabled={page === 0} aria-label="Poprzednia strona">
          <ChevronLeft />
          <span className="hidden sm:inline">Poprzednia</span>
        </Button>
        <span className="min-w-12 text-center text-muted-foreground tabular-nums">
          {page + 1} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount - 1}
          aria-label="Następna strona"
        >
          <span className="hidden sm:inline">Następna</span>
          <ChevronRight />
        </Button>
      </div>
    </nav>
  )
}

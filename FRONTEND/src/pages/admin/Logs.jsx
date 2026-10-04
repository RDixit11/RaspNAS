import { CircleAlert, Info, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import ErrorAlert from '@/components/ErrorAlert'
import PageHeader from '@/components/PageHeader'
import Pagination from '@/components/Pagination'
import SearchInput from '@/components/SearchInput'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { useResource } from '@/hooks/useResource'
import { formatDate } from '@/lib/format'
import { LOG_CATEGORY, LOG_LEVEL } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { listLogs } from '@/services/logs'

const PAGE_SIZE = 25
const ALL = 'all'
const LEVEL_ICON = {
  info: { icon: Info, className: 'text-sky-500' },
  warning: { icon: TriangleAlert, className: 'text-amber-500' },
  error: { icon: CircleAlert, className: 'text-red-500' },
}

function Filter({ label, value, onChange, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="w-full sm:w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={ALL}>{label}: wszystkie</SelectItem>
        {Object.entries(options).map(([key, text]) => (
          <SelectItem key={key} value={key}>
            {text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default function Logs() {
  const [level, setLevel] = useState(ALL)
  const [category, setCategory] = useState(ALL)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  const filters = { level: level === ALL ? '' : level, category: category === ALL ? '' : category, q: query.trim() }
  const logs = useResource(() => listLogs({ ...filters, page: page + 1, pageSize: PAGE_SIZE }), [level, category, query, page], {
    interval: 15_000,
  })

  // zmiana filtra wraca na pierwszą stronę
  const update = (setter) => (value) => {
    setter(value)
    setPage(0)
  }

  return (
    <>
      <PageHeader
        title="Dziennik zdarzeń"
        description="Logowania, zmiany uprawnień, operacje na plikach i stan węzłów — do diagnozowania awarii i wykrywania ataków."
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SearchInput
          className="min-w-0 flex-1 sm:min-w-56"
          placeholder="Szukaj w treści, użytkowniku, adresie IP"
          aria-label="Szukaj w dzienniku"
          value={query}
          onChange={(e) => update(setQuery)(e.target.value)}
        />
        <Filter label="Poziom" value={level} onChange={update(setLevel)} options={LOG_LEVEL} />
        <Filter label="Kategoria" value={category} onChange={update(setCategory)} options={LOG_CATEGORY} />
      </div>

      <ErrorAlert error={logs.error} className="mb-4" />
      <Card>
        <CardContent>
          {logs.loading && <Spinner className="mx-auto my-10 size-6 text-muted-foreground" />}
          {logs.data?.items.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Brak zdarzeń pasujących do filtrów.</p>
          )}
          <ol className="-mt-3 divide-y">
            {logs.data?.items.map((event) => {
              const { icon: Icon, className } = LEVEL_ICON[event.level]
              return (
                <li key={event.id} className={cn('flex gap-3 py-3', event.level === 'error' && 'bg-red-500/5')}>
                  <Icon className={cn('mt-0.5 size-4 shrink-0', className)} aria-label={LOG_LEVEL[event.level]} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm wrap-anywhere">{event.message}</p>
                    <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                      <time dateTime={event.time}>{formatDate(event.time)}</time>
                      <span>· {LOG_CATEGORY[event.category]}</span>
                      {event.username && <span>· {event.username}</span>}
                      {event.ip && <span className="font-mono">· {event.ip}</span>}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
          {logs.data && <Pagination page={page} pageSize={PAGE_SIZE} total={logs.data.total} onChange={setPage} />}
        </CardContent>
      </Card>
    </>
  )
}

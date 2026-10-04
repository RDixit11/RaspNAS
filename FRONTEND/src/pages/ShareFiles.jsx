import { ArrowLeft, FolderX } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import FileBrowser from '@/components/files/FileBrowser'
import SharePaths from '@/components/SharePaths'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { useResource } from '@/hooks/useResource'
import { formatBytes } from '@/lib/format'
import { ACCESS } from '@/lib/labels'
import { listShares } from '@/services/shares'

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
      <Link to="/pliki">
        <ArrowLeft /> Wszystkie udziały
      </Link>
    </Button>
  )
}

export default function ShareFiles() {
  const { shareId } = useParams()
  const shares = useResource(listShares)
  const share = shares.data?.find((item) => item.id === shareId)

  if (shares.loading) return <Spinner className="mx-auto my-16 size-6 text-muted-foreground" />
  if (!share) {
    return (
      <>
        <BackLink />
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderX />
            </EmptyMedia>
            <EmptyTitle>Nie znaleziono udziału</EmptyTitle>
            <EmptyDescription>Udział nie istnieje albo nie masz do niego dostępu.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </>
    )
  }

  return (
    <>
      <BackLink />
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="min-w-0 text-2xl font-bold tracking-tight wrap-anywhere">{share.name}</h1>
        <StatusBadge tone={share.access === 'write' ? 'ok' : 'info'}>{ACCESS[share.access]}</StatusBadge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <FileBrowser share={share} readOnly={share.access !== 'write'} onChanged={shares.reload} />
        </div>
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Podłączenie w systemie</CardTitle>
            <CardDescription>
              Udział możesz dodać jako dysk sieciowy — zajmuje teraz {formatBytes(share.usedBytes)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SharePaths share={share} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

import { FolderOpen, Lock, PenLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import ErrorAlert from '@/components/ErrorAlert'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { useResource } from '@/hooks/useResource'
import { formatBytes } from '@/lib/format'
import { listShares } from '@/services/shares'

export default function Files() {
  const { data: shares, error, loading } = useResource(listShares)

  return (
    <>
      <PageHeader title="Pliki" description="Udziały, do których masz dostęp. Każdy z nich to folder w jednym systemie plików wszystkich węzłów." />
      <ErrorAlert error={error} />
      {loading && <Spinner className="mx-auto my-16 size-6 text-muted-foreground" />}
      {shares?.length === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Lock />
            </EmptyMedia>
            <EmptyTitle>Brak dostępnych udziałów</EmptyTitle>
            <EmptyDescription>Administrator nie nadał Ci jeszcze dostępu do żadnego udziału.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shares?.map((share) => (
          <Link
            key={share.id}
            to={`/pliki/${share.id}`}
            className="group rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Card className="h-full transition-colors group-hover:bg-muted/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="size-4 shrink-0 text-primary" />
                  <span className="truncate">{share.name}</span>
                </CardTitle>
                <CardDescription className="line-clamp-2">{share.description || 'Bez opisu'}</CardDescription>
                <CardAction>
                  {share.access === 'write' ? (
                    <StatusBadge tone="ok">
                      <PenLine className="size-3" /> Zapis
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="info">Odczyt</StatusBadge>
                  )}
                </CardAction>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {formatBytes(share.usedBytes)}
                {[share.smb && 'SMB', share.nfs && 'NFS'].filter(Boolean).length > 0 &&
                  ` · ${[share.smb && 'SMB', share.nfs && 'NFS'].filter(Boolean).join(', ')}`}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}

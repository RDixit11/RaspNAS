import { FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmDialog from '@/components/ConfirmDialog'
import ErrorAlert from '@/components/ErrorAlert'
import PageHeader from '@/components/PageHeader'
import PermissionsDialog from '@/components/shares/PermissionsDialog'
import ShareFormDialog from '@/components/shares/ShareFormDialog'
import SharePaths from '@/components/SharePaths'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useCluster } from '@/hooks/useCluster'
import { useResource } from '@/hooks/useResource'
import { formatBytes } from '@/lib/format'
import { plural } from '@/lib/plural'
import { createShare, deleteShare, listShares, updateShare } from '@/services/shares'

export default function Shares() {
  const cluster = useCluster()
  const shares = useResource(listShares)
  const [error, setError] = useState(null)

  const after = async (action) => {
    await action()
    shares.reload()
    cluster.reload()
  }

  const remove = async (share) => {
    setError(null)
    try {
      await after(() => deleteShare(share.id))
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <PageHeader title="Udziały" description="Główne foldery systemu plików z uprawnieniami użytkowników.">
        <ShareFormDialog
          trigger={
            <Button>
              <Plus /> Nowy udział
            </Button>
          }
          onSave={(form) => after(() => createShare(form))}
        />
      </PageHeader>

      <ErrorAlert error={error ?? shares.error} onClose={error ? () => setError(null) : undefined} className="mb-6" />
      {shares.loading && <Spinner className="mx-auto my-16 size-6 text-muted-foreground" />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {shares.data?.map((share) => {
          const granted = Object.keys(share.permissions ?? {}).length
          return (
            <Card key={share.id}>
              <CardHeader>
                <CardTitle className="flex min-w-0 flex-wrap items-center gap-2">
                  <FolderOpen className="size-4 shrink-0 text-primary" />
                  <Link to={`/pliki/${share.id}`} className="-my-1 min-w-0 truncate py-1 hover:underline pointer-coarse:-my-2 pointer-coarse:py-2">
                    {share.name}
                  </Link>
                  {share.smb && <Badge variant="outline">SMB</Badge>}
                  {share.nfs && <Badge variant="outline">NFS</Badge>}
                </CardTitle>
                <CardDescription>
                  {share.description || 'Bez opisu'} · {formatBytes(share.usedBytes)} ·{' '}
                  {granted ? `dostęp: ${plural(granted, ['użytkownik', 'użytkowników', 'użytkowników'])}` : 'tylko administratorzy'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SharePaths share={share} />
              </CardContent>
              <CardFooter className="flex-wrap gap-2">
                <PermissionsDialog share={share} onSave={(permissions) => after(() => updateShare(share.id, { permissions }))} />
                <ShareFormDialog
                  share={share}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Pencil /> Edytuj
                    </Button>
                  }
                  onSave={(form) => after(() => updateShare(share.id, form))}
                />
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="ml-auto text-destructive">
                      <Trash2 /> Usuń
                    </Button>
                  }
                  title={`Usunąć udział ${share.name}?`}
                  description={`Wszystkie pliki udziału (${formatBytes(share.usedBytes)}) zostaną trwale usunięte ze wszystkich węzłów.`}
                  onConfirm={() => remove(share)}
                />
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </>
  )
}

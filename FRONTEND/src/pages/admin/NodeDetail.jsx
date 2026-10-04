import { ArrowLeft, Power, PowerOff, ServerOff, Unplug } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import DiskBay from '@/components/cluster/DiskBay'
import NodeMetrics from '@/components/cluster/NodeMetrics'
import NodeStatusBadge from '@/components/cluster/NodeStatusBadge'
import ConfirmDialog from '@/components/ConfirmDialog'
import ErrorAlert from '@/components/ErrorAlert'
import RenameDialog from '@/components/RenameDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { useCluster } from '@/hooks/useCluster'
import { useResource } from '@/hooks/useResource'
import { formatBytes, formatDate } from '@/lib/format'
import { ejectDisk, formatDisk, getNode, insertDisk, removeNode, renameNode, setNodeOnline } from '@/services/cluster'

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
      <Link to="/wezly">
        <ArrowLeft /> Wszystkie węzły
      </Link>
    </Button>
  )
}

function Info({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{children}</dd>
    </div>
  )
}

export default function NodeDetail() {
  const { nodeId } = useParams()
  const navigate = useNavigate()
  const cluster = useCluster()
  // przy formatowaniu odświeżamy co sekundę, żeby pasek postępu był płynny
  const node = useResource(() => getNode(nodeId), [nodeId], {
    interval: (data) => (data?.disks.some((disk) => disk.state === 'formatting') ? 1_000 : 5_000),
  })
  const [error, setError] = useState(null)

  const run = async (action) => {
    setError(null)
    try {
      await action()
      node.reload()
      cluster.reload()
    } catch (err) {
      setError(err)
    }
  }

  if (node.loading) return <Spinner className="mx-auto my-16 size-6 text-muted-foreground" />
  if (!node.data) {
    return (
      <>
        <BackLink />
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ServerOff />
            </EmptyMedia>
            <EmptyTitle>Nie znaleziono węzła</EmptyTitle>
            <EmptyDescription>{node.error?.message ?? 'Węzeł mógł zostać odłączony od klastra.'}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </>
    )
  }

  const data = node.data
  const isCoordinator = data.role === 'coordinator'

  const handleRemove = async () => {
    setError(null)
    try {
      await removeNode(data.id)
      cluster.reload()
      navigate('/wezly')
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <BackLink />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="min-w-0 text-2xl font-bold tracking-tight wrap-anywhere">{data.name}</h1>
            <RenameDialog
              title="Zmień nazwę węzła"
              description={`Węzeł ${data.ip}.`}
              initialName={data.name}
              triggerLabel={`Zmień nazwę węzła ${data.name}`}
              onSave={(name) => renameNode(data.id, name).then(() => node.reload())}
            />
            <NodeStatusBadge status={data.status} />
            {isCoordinator && <Badge variant="outline">Koordynator</Badge>}
          </div>
          <p className="mt-1 text-muted-foreground">
            <span className="font-mono">{data.ip}</span> · {data.model}
          </p>
        </div>
        {!isCoordinator && (
          <div className="flex flex-wrap gap-2">
            {cluster.data.simulation && (
              <Button
                variant="outline"
                onClick={() => run(() => setNodeOnline(data.id, !data.online))}
                title="Narzędzie testowe: udaje awarię węzła albo jego powrót"
              >
                {data.online ? <PowerOff /> : <Power />} {data.online ? 'Symuluj awarię' : 'Przywróć węzeł'}
              </Button>
            )}
            <ConfirmDialog
              trigger={
                <Button variant="destructive">
                  <Unplug /> Odłącz węzeł
                </Button>
              }
              title={`Odłączyć ${data.name} od klastra?`}
              description={`Pliki z tego węzła (${formatBytes(data.usedBytes)}) zostaną najpierw przeniesione na pozostałe węzły. Potem węzeł zniknie z klastra.`}
              confirmLabel="Odłącz"
              onConfirm={handleRemove}
            />
          </div>
        )}
      </div>

      <ErrorAlert error={error} onClose={() => setError(null)} className="mb-6" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Stan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <NodeMetrics node={data} />
            <dl className="divide-y border-t">
              <Info label="Rdzenie procesora">{data.cpuCores}</Info>
              <Info label="Pamięć RAM">{formatBytes(data.ramBytes)}</Info>
              <Info label="W klastrze od">{formatDate(data.joinedAt)}</Info>
            </dl>
          </CardContent>
        </Card>

        <section className="min-w-0 space-y-3 lg:col-span-2" aria-labelledby="bays-title">
          <h2 id="bays-title" className="text-lg font-semibold">
            Dyski ({data.disks.filter((disk) => disk.state !== 'empty').length} z {data.bays} kieszeni)
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {data.disks.map((disk) => (
              <DiskBay
                key={disk.bay}
                disk={disk}
                canFormat={data.online}
                onFormat={() => run(() => formatDisk(data.id, disk.id))}
                onInsert={cluster.data.simulation ? () => run(() => insertDisk(data.id, disk.bay)) : undefined}
                onEject={cluster.data.simulation ? () => run(() => ejectDisk(data.id, disk.id)) : undefined}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

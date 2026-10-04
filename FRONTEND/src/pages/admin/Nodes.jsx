import { CircleCheck, FlaskConical, Server, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AddNodeDialog from '@/components/cluster/AddNodeDialog'
import DiskStrip from '@/components/cluster/DiskStrip'
import JoinRequests from '@/components/cluster/JoinRequests'
import NodeMetrics from '@/components/cluster/NodeMetrics'
import NodeStatusBadge from '@/components/cluster/NodeStatusBadge'
import ErrorAlert from '@/components/ErrorAlert'
import PageHeader from '@/components/PageHeader'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useCluster } from '@/hooks/useCluster'
import { useResource } from '@/hooks/useResource'
import { formatBytes } from '@/lib/format'
import { listJoinRequests, listNodes, simulateJoinRequest } from '@/services/cluster'

const REFRESH_MS = 5_000

function NodeCard({ node }) {
  return (
    <Link to={`/wezly/${node.id}`} className="group rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      <Card className="h-full transition-colors group-hover:bg-muted/40">
        <CardHeader>
          <CardTitle className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate">{node.name}</span>
            {node.role === 'coordinator' && <Badge variant="outline">Koordynator</Badge>}
          </CardTitle>
          <CardDescription>
            <span className="font-mono">{node.ip}</span> · {node.model}
          </CardDescription>
          <CardAction>
            <NodeStatusBadge status={node.status} />
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <NodeMetrics node={node} />
          <DiskStrip disks={node.disks} />
        </CardContent>
      </Card>
    </Link>
  )
}

export default function Nodes() {
  const cluster = useCluster()
  const nodes = useResource(listNodes, [], { interval: REFRESH_MS })
  const requests = useResource(listJoinRequests, [], { interval: REFRESH_MS })
  const [joined, setJoined] = useState(null)
  const [error, setError] = useState(null)

  const refreshAll = () => {
    nodes.reload()
    requests.reload()
    cluster.reload()
  }

  const handleJoined = (node) => {
    setJoined(node)
    refreshAll()
  }

  const simulate = async () => {
    setError(null)
    try {
      await simulateJoinRequest()
      requests.reload()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <PageHeader title="Węzły" description="Urządzenia klastra — koordynator i węzły z dyskami. Dane odświeżają się co kilka sekund.">
        <div className="flex flex-wrap gap-2">
          {cluster.data.simulation && (
            <Button variant="outline" onClick={simulate} title="Narzędzie testowe: udaje zgłoszenie agenta z nowego urządzenia">
              <FlaskConical /> Symuluj zgłoszenie
            </Button>
          )}
          <AddNodeDialog onAdded={handleJoined} />
        </div>
      </PageHeader>

      <div className="space-y-6">
        <ErrorAlert error={error ?? nodes.error} onClose={error ? () => setError(null) : undefined} />
        {joined && (
          <Alert className="has-data-[slot=alert-action]:pr-10">
            <CircleCheck className="text-emerald-600 dark:text-emerald-400" />
            <AlertTitle>Węzeł {joined.name} dołączył do klastra</AlertTitle>
            <AlertDescription>
              Zgłosił dyski o łącznej pojemności {formatBytes(joined.capacityBytes)} — są już w puli.
            </AlertDescription>
            <AlertAction>
              <Button variant="ghost" size="icon-xs" onClick={() => setJoined(null)} aria-label="Zamknij komunikat">
                <X />
              </Button>
            </AlertAction>
          </Alert>
        )}
        {requests.data?.length > 0 && <JoinRequests requests={requests.data} onChanged={refreshAll} onApproved={handleJoined} />}

        {nodes.loading && <Spinner className="mx-auto my-16 size-6 text-muted-foreground" />}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {nodes.data?.map((node) => (
            <NodeCard key={node.id} node={node} />
          ))}
        </div>
        {nodes.data?.length === 1 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Server className="size-4" /> Klaster ma tylko koordynatora — dodaj węzły, aby zwiększyć miejsce.
          </p>
        )}
      </div>
    </>
  )
}

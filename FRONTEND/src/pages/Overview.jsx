import { ArrowRight, CircleAlert, FolderOpen, HardDrive, Info, Server, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatusBadge, { StatusDot } from '@/components/StatusBadge'
import UsageBar from '@/components/UsageBar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useCluster } from '@/hooks/useCluster'
import { useResource } from '@/hooks/useResource'
import { formatBytes, formatRelative } from '@/lib/format'
import { ACCESS, LOG_CATEGORY } from '@/lib/labels'
import { plural } from '@/lib/plural'
import { listShares } from '@/services/shares'

const ALERT_ICON = { error: CircleAlert, warning: TriangleAlert, info: Info }
const LEVEL_TONE = { info: 'ok', warning: 'warning', error: 'error' }

function StatCard({ icon: Icon, label, value, children, to }) {
  const body = (
    <Card className="h-full transition-colors group-hover:bg-muted/40">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Icon className="size-4 text-primary" /> {label}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle>
        {to && (
          <CardAction>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  )
  return to ? (
    <Link to={to} className="group rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  )
}

export default function Overview() {
  const { user, isAdmin } = useAuth()
  const { data: cluster } = useCluster()
  const shares = useResource(listShares)

  const { nodes, pool, alerts } = cluster
  const offlineCapacity = pool.capacityBytes - pool.onlineCapacityBytes
  const counts = alerts.reduce((acc, alert) => ({ ...acc, [alert.level]: (acc[alert.level] ?? 0) + 1 }), {})

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight wrap-anywhere sm:text-3xl">Cześć, {user.username}!</h1>
      <p className="mt-1 text-muted-foreground">
        {cluster.name} · koordynator {cluster.coordinator.name} ({cluster.coordinator.ip})
      </p>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Server} label="Węzły" value={`${nodes.online} / ${nodes.total}`} to={isAdmin ? '/wezly' : undefined}>
          <div className="flex flex-wrap gap-1.5" aria-label="Stan węzłów">
            {nodes.items.map((node) => (
              <span key={node.id} title={`${node.name}: ${node.online ? 'działa' : 'nie odpowiada'}`}>
                <StatusDot tone={node.online ? 'ok' : 'off'} />
              </span>
            ))}
          </div>
          <p>{nodes.online === nodes.total ? 'Wszystkie działają' : `Nie odpowiada: ${nodes.total - nodes.online}`}</p>
        </StatCard>

        <StatCard icon={HardDrive} label="Miejsce w puli" value={formatBytes(pool.usedBytes)}>
          <UsageBar used={pool.usedBytes} capacity={pool.capacityBytes} />
          <p>
            z {formatBytes(pool.capacityBytes)}
            {offlineCapacity > 0 && ` · ${formatBytes(offlineCapacity)} na niedostępnych węzłach`}
          </p>
        </StatCard>

        <StatCard icon={FolderOpen} label="Twoje udziały" value={cluster.shares.accessible} to="/pliki">
          <p>{isAdmin ? 'Administrator ma dostęp do wszystkich' : `z ${cluster.shares.total} w systemie`}</p>
        </StatCard>

        <StatCard icon={TriangleAlert} label="Alerty" value={alerts.length}>
          <div className="flex flex-wrap gap-1.5">
            {counts.error > 0 && <StatusBadge tone="error">{plural(counts.error, ['błąd', 'błędy', 'błędów'])}</StatusBadge>}
            {counts.warning > 0 && (
              <StatusBadge tone="warning">{plural(counts.warning, ['ostrzeżenie', 'ostrzeżenia', 'ostrzeżeń'])}</StatusBadge>
            )}
            {counts.info > 0 && <StatusBadge tone="info">{plural(counts.info, ['informacja', 'informacje', 'informacji'])}</StatusBadge>}
            {alerts.length === 0 && <p>Wszystko w porządku</p>}
          </div>
        </StatCard>
      </section>

      {alerts.length > 0 && (
        <section className="mt-8 space-y-3" aria-labelledby="alerts-title">
          <h2 id="alerts-title" className="text-lg font-semibold">
            Wymaga uwagi
          </h2>
          {alerts.map((alert, index) => {
            const Icon = ALERT_ICON[alert.level]
            // gdzie to naprawić — tylko administrator ma dostęp do tych sekcji
            const link = isAdmin && { node: `/wezly/${alert.nodeId}`, disk: `/wezly/${alert.nodeId}`, join: '/wezly', backup: '/kopie' }[alert.kind]
            return (
              <Alert key={index} variant={alert.level === 'error' ? 'destructive' : 'default'}>
                <Icon className={alert.level === 'warning' ? 'text-amber-500' : alert.level === 'info' ? 'text-sky-500' : undefined} />
                <AlertDescription className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span>{alert.message}</span>
                  {link && (
                    <Link to={link} className="-my-1 inline-block shrink-0 py-1 text-sm font-medium text-primary hover:underline pointer-coarse:-my-2 pointer-coarse:py-2">
                      Szczegóły
                    </Link>
                  )}
                </AlertDescription>
              </Alert>
            )
          })}
        </section>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Szybki dostęp</CardTitle>
            <CardDescription>Udziały, do których masz dostęp</CardDescription>
          </CardHeader>
          <CardContent>
            {shares.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">Nie masz jeszcze dostępu do żadnego udziału — poproś administratora.</p>
            )}
            <ul className="-my-2 divide-y">
              {shares.data?.slice(0, 6).map((share) => (
                <li key={share.id}>
                  <Link to={`/pliki/${share.id}`} className="flex items-center gap-3 py-2.5 hover:text-primary pointer-coarse:py-3">
                    <FolderOpen className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate font-medium">{share.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{ACCESS[share.access]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Ostatnie zdarzenia</CardTitle>
              <CardDescription>Z dziennika systemowego</CardDescription>
              <CardAction>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/dziennik">Cały dziennik</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ul className="-my-2 divide-y">
                {cluster.recentEvents.map((event) => (
                  <li key={event.id} className="flex gap-3 py-2.5 text-sm">
                    <StatusDot tone={LEVEL_TONE[event.level]} className="mt-1.5" />
                    <div className="min-w-0 flex-1">
                      <p className="wrap-anywhere">{event.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelative(event.time)} · {LOG_CATEGORY[event.category]}
                        {event.username && ` · ${event.username}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

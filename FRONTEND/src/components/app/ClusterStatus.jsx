import { Link } from 'react-router-dom'
import { StatusDot } from '@/components/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { useCluster } from '@/hooks/useCluster'

// Skrót stanu klastra w nagłówku — zawsze widać, czy wszystkie serwery działają
export default function ClusterStatus() {
  const { isAdmin } = useAuth()
  const { data: cluster } = useCluster()
  if (!cluster) return null

  const { online, total } = cluster.nodes
  const errors = cluster.alerts.filter((alert) => alert.level === 'error').length
  const tone = online < total || errors ? 'error' : cluster.alerts.some((alert) => alert.level === 'warning') ? 'warning' : 'ok'
  const content = (
    <>
      <StatusDot tone={tone} />
      <span className="truncate">
        <span className="font-medium text-foreground">{cluster.name}</span>
        <span className="hidden sm:inline"> · </span>
        <span className="block sm:inline">
          węzły: {online}/{total} działa
        </span>
      </span>
    </>
  )
  const className = 'flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground sm:text-sm'

  return isAdmin ? (
    <Link to="/wezly" className={`${className} hover:bg-muted`} title="Stan węzłów klastra">
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}

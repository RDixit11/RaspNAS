import UsageBar from '@/components/UsageBar'
import { formatBytes, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'

function Metric({ label, value, children }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      {children}
    </div>
  )
}

// CPU, pamięć, temperatura i miejsce na dyskach — przy niedziałającym węźle tylko informacja, od kiedy milczy
export default function NodeMetrics({ node }) {
  const since = formatDuration(node.statusSeconds)
  const hot = node.metrics?.temperatureC >= 70

  return (
    <div className="space-y-3">
      {node.metrics ? (
        <>
          <Metric label="Procesor" value={`${Math.round(node.metrics.cpuPercent)}%`}>
            <UsageBar used={node.metrics.cpuPercent} capacity={100} />
          </Metric>
          <Metric label="Pamięć RAM" value={`${formatBytes(node.metrics.ramUsedBytes)} z ${formatBytes(node.ramBytes)}`}>
            <UsageBar used={node.metrics.ramUsedBytes} capacity={node.ramBytes} />
          </Metric>
        </>
      ) : (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Agent nie odpowiada od {since}</p>
      )}
      <Metric label="Miejsce na dyskach" value={`${formatBytes(node.usedBytes)} z ${formatBytes(node.capacityBytes)}`}>
        <UsageBar used={node.usedBytes} capacity={node.capacityBytes} />
      </Metric>
      {node.metrics && (
        <p className="flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground">
          <span className={cn(hot && 'font-medium text-red-600 dark:text-red-400')}>
            Temperatura: {node.metrics.temperatureC.toLocaleString('pl-PL')} °C
          </span>
          <span>Działa od {since}</span>
        </p>
      )}
    </div>
  )
}

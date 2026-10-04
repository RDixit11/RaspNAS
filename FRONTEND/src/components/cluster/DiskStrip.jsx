import { StatusDot } from '@/components/StatusBadge'
import { DISK_STATE } from '@/lib/labels'

// Kieszenie na dyski w skrócie — do karty węzła
export default function DiskStrip({ disks }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Kieszenie na dyski">
      {disks.map((disk) => {
        const state = DISK_STATE[disk.state]
        return (
          <li
            key={disk.bay}
            title={`Kieszeń ${disk.bay}: ${state.label}${disk.model ? ` — ${disk.model}` : ''}`}
            className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
          >
            <StatusDot tone={state.tone} className="size-2" />
            {disk.bay}. {state.label}
          </li>
        )
      })}
    </ul>
  )
}

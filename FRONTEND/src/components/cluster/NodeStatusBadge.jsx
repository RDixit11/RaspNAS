import StatusBadge from '@/components/StatusBadge'
import { NODE_STATUS } from '@/lib/labels'

export default function NodeStatusBadge({ status }) {
  const { label, tone } = NODE_STATUS[status]
  return <StatusBadge tone={tone}>{label}</StatusBadge>
}

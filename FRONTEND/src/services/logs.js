import { api, query } from '@/services/api'

// { items, total, page, pageSize } — najnowsze na górze
export function listLogs({ level, category, q, page = 1, pageSize = 25 }) {
  const params = { page, pageSize, ...(level && { level }), ...(category && { category }), ...(q && { q }) }
  return api(`/logs?${query(params)}`)
}

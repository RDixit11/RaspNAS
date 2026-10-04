const number = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 })
const date = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' })

export function formatBytes(bytes) {
  if (bytes == null) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${number.format(value)} ${units[unit]}`
}

export const formatDate = (iso) => (iso ? date.format(new Date(iso)) : '—')

const relative = new Intl.RelativeTimeFormat('pl-PL', { numeric: 'auto' })
const UNITS = [
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
]

// „2 godziny temu”, „wczoraj”
export function formatRelative(value) {
  if (!value) return '—'
  const seconds = (new Date(value).getTime() - Date.now()) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'przed chwilą'
}

// Czas trwania w sekundach → „12 dni 3 godz.”, „45 min”
export function formatDuration(seconds) {
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  if (days) return `${days} ${days === 1 ? 'dzień' : 'dni'}${hours ? ` ${hours} godz.` : ''}`
  if (hours) return `${hours} godz.${minutes ? ` ${minutes} min` : ''}`
  return `${Math.max(1, minutes)} min`
}

// Ścieżki w udziale: '/' to główny folder, '/Kadry/2026' — podfolder

export const parentPath = (path) => {
  const parts = path.split('/').filter(Boolean)
  return parts.length > 1 ? `/${parts.slice(0, -1).join('/')}` : '/'
}

export const baseName = (path, rootName) => path.split('/').filter(Boolean).at(-1) ?? rootName

// Czy `entry` ({ path, type }) można przenieść do folderu `destination`
export function canMoveTo(entry, destination) {
  if (!entry || destination === parentPath(entry.path)) return false // już tam jest
  if (entry.type === 'dir' && (destination === entry.path || destination.startsWith(`${entry.path}/`))) return false // do siebie
  return true
}

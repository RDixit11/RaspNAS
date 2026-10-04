import { api, ApiError, apiUpload, query } from '@/services/api'

const base = (shareId) => `/shares/${shareId}`

// { path, entries: [{ name, type: 'dir' | 'file', size, nodeId, modifiedAt }] }
export const listFiles = (shareId, path) => api(`${base(shareId)}/files?${query({ path })}`)

export function uploadFiles(shareId, path, files, onProgress) {
  const form = new FormData()
  for (const file of files) form.append('files', file)
  return apiUpload(`${base(shareId)}/files?${query({ path })}`, form, onProgress)
}

export const createFolder = (shareId, path, name) =>
  api(`${base(shareId)}/folders`, { method: 'POST', body: { path, name } })

export const deleteEntry = (shareId, path) => api(`${base(shareId)}/files?${query({ path })}`, { method: 'DELETE' })

export const fileUrl = (shareId, path, { download = false } = {}) =>
  `/api${base(shareId)}/files/content?${query(download ? { path, download: 'true' } : { path })}`

export async function fetchFileText(shareId, path) {
  const response = await fetch(fileUrl(shareId, path))
  if (!response.ok) throw new ApiError('Nie udało się wczytać pliku.', response.status)
  return response.text()
}

// Przenosi plik albo folder do innego folderu tego samego udziału → { path } (nowa ścieżka)
export const moveEntry = (shareId, path, destination) =>
  api(`${base(shareId)}/files/move`, { method: 'POST', body: { path, destination } })

// Wszystkie foldery udziału: ['/', '/Kadry', '/Kadry/2026', …]
export const listFolders = (shareId) => api(`${base(shareId)}/folders`)

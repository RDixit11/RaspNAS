import { api } from '@/services/api'

export const listBackups = () => api('/backups')
export const createBackup = (job) => api('/backups', { method: 'POST', body: job })
export const runBackup = (jobId) => api(`/backups/${jobId}/run`, { method: 'POST' })
export const deleteBackup = (jobId) => api(`/backups/${jobId}`, { method: 'DELETE' })

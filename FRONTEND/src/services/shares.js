import { api } from '@/services/api'

// Udziały, do których masz dostęp: { id, name, description, smb, nfs, access, usedBytes, smbPath, nfsPath,
// permissions (tylko admin) }
export const listShares = () => api('/shares')
export const createShare = (share) => api('/shares', { method: 'POST', body: share })
export const updateShare = (shareId, changes) => api(`/shares/${shareId}`, { method: 'PATCH', body: changes })
export const deleteShare = (shareId) => api(`/shares/${shareId}`, { method: 'DELETE' })

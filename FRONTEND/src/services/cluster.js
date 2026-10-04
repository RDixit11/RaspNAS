import { api } from '@/services/api'

// Przegląd klastra dla każdego zalogowanego: węzły (w skrócie), pula, alerty, ostatnie zdarzenia (admin)
export const getCluster = () => api('/cluster')

// --- węzły (administrator) ---
export const listNodes = () => api('/nodes')
export const getNode = (nodeId) => api(`/nodes/${nodeId}`)
export const addNode = ({ ip, name }) => api('/nodes', { method: 'POST', body: { ip, name } })
export const renameNode = (nodeId, name) => api(`/nodes/${nodeId}`, { method: 'PATCH', body: { name } })
// tylko symulacja — udaje awarię węzła albo jego powrót
export const setNodeOnline = (nodeId, online) => api(`/nodes/${nodeId}`, { method: 'PATCH', body: { online } })
export const removeNode = (nodeId) => api(`/nodes/${nodeId}`, { method: 'DELETE' })
export const formatDisk = (nodeId, diskId) => api(`/nodes/${nodeId}/disks/${diskId}/format`, { method: 'POST' })
// symulacja wymiany dysku w szufladzie
export const insertDisk = (nodeId, bay) => api(`/nodes/${nodeId}/bays/${bay}/insert`, { method: 'POST' })
export const ejectDisk = (nodeId, diskId) => api(`/nodes/${nodeId}/disks/${diskId}/eject`, { method: 'POST' })

// --- zgłoszenia nowych węzłów ---
export const listJoinRequests = () => api('/nodes/join-requests')
export const approveJoinRequest = (requestId, code) =>
  api(`/nodes/join-requests/${requestId}/approve`, { method: 'POST', body: { code } })
export const rejectJoinRequest = (requestId) => api(`/nodes/join-requests/${requestId}`, { method: 'DELETE' })
// tylko symulacja — udaje, że agent na nowym urządzeniu zgłosił się do koordynatora
export const simulateJoinRequest = () => api('/nodes/join-requests/simulate', { method: 'POST' })

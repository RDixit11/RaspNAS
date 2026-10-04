import { api } from '@/services/api'

export const listUsers = () => api('/users')
export const createUser = (user) => api('/users', { method: 'POST', body: user })
// { role?, active?, password? }
export const updateUser = (userId, changes) => api(`/users/${userId}`, { method: 'PATCH', body: changes })
export const deleteUser = (userId) => api(`/users/${userId}`, { method: 'DELETE' })

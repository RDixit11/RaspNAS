import { api } from '@/services/api'

export const changePassword = (currentPassword, newPassword) =>
  api('/account/password', { method: 'POST', body: { currentPassword, newPassword } })

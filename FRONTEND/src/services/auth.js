import { api } from '@/services/api'

// → zalogowany użytkownik { id, username, role }; sesja w ciasteczku HttpOnly
export const login = (username, password) => api('/auth/login', { method: 'POST', body: { username, password } })

export const logout = () => api('/auth/logout', { method: 'POST' })

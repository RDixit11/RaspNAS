import { useEffect, useState } from 'react'
import { AUTH_STORAGE_KEY, AuthContext } from '@/context/authContext'
import { setUnauthorizedHandler } from '@/services/api'
import * as authApi from '@/services/auth'

// Zapamiętany użytkownik służy tylko do UI — o dostępie decyduje ciasteczko sesji w koordynatorze.
function readStoredUser() {
  try {
    const user = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY))
    return user?.role ? user : null // stary format (sprzed ról) — trzeba zalogować się ponownie
  } catch {
    return null
  }
}

function storeUser(user) {
  try {
    if (user) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // brak dostępu do localStorage — po przeładowaniu trzeba się zalogować ponownie
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)

  const signIn = (loggedUser) => {
    storeUser(loggedUser)
    setUser(loggedUser)
    return loggedUser
  }

  const signOut = () => {
    storeUser(null)
    setUser(null)
  }

  useEffect(() => {
    setUnauthorizedHandler(signOut)
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = async ({ username, password }) => signIn(await authApi.login(username, password))

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // koordynator niedostępny — i tak czyścimy sesję po stronie przeglądarki
    }
    signOut()
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === 'admin', login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

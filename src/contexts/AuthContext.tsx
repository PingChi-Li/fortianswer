import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import type { AppRole } from '../types'
import { STORAGE_KEYS } from '../utils/constants'

interface AuthUser {
  username: string
  role: AppRole
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  role: AppRole | null
  login: (username: string, password: string, role: AppRole) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getStoredAuthSession(): AuthUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION)
    if (!stored) return null
    const parsed = JSON.parse(stored) as { username?: string; role?: string }
    if (parsed?.username && parsed?.role && (parsed.role === 'Customer' || parsed.role === 'Agent' || parsed.role === 'Admin')) {
      return { username: parsed.username, role: parsed.role as AppRole }
    }
  } catch {
    // ignore invalid session
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuthSession())

  const login = useCallback((username: string, _password: string, role: AppRole) => {
    const session = { username, role }
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session))
    localStorage.setItem(STORAGE_KEYS.ROLE, role)
    setUser(session)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION)
    localStorage.removeItem(STORAGE_KEYS.ROLE)
    setUser(null)
  }, [])

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.ROLE, user.role)
    }
  }, [user])

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    role: user?.role ?? null,
    login,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

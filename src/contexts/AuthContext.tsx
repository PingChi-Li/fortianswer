import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import type { AppRole } from '../types'
import { STORAGE_KEYS } from '../utils/constants'
import * as authService from '../services/authService'

interface AuthUser {
  username: string
  role: AppRole
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  role: AppRole | null
  login: (username: string, password: string) => Promise<void>
  register: (payload: authService.RegisterPayload) => Promise<void>
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

  const login = useCallback(async (username: string, password: string) => {
    const res = await authService.login(username, password)
    const session = { username: res.username, role: res.role }
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session))
    localStorage.setItem(STORAGE_KEYS.ROLE, res.role)
    setUser(session)
  }, [])

  const register = useCallback(async (payload: authService.RegisterPayload) => {
    await authService.register(payload)
    const session = { username: payload.username, role: (payload.role ?? 'Customer') as AppRole }
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session))
    localStorage.setItem(STORAGE_KEYS.ROLE, session.role)
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
    register,
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

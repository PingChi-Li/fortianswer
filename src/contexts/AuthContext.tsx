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

function getStoredRole(): AppRole | null {
  const stored = localStorage.getItem(STORAGE_KEYS.ROLE)
  if (stored === 'Customer' || stored === 'Agent' || stored === 'Admin') {
    return stored
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const role = getStoredRole()
    if (role) {
      return { username: 'user', role }
    }
    return null
  })

  const login = useCallback((username: string, _password: string, role: AppRole) => {
    localStorage.setItem(STORAGE_KEYS.ROLE, role)
    setUser({ username, role })
  }, [])

  const logout = useCallback(() => {
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

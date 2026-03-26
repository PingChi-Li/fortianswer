import type { AppRole } from '../types'
import { apiFetch } from './apiClient'

export interface LoginResponse {
  authenticated: boolean
  username: string
  role: AppRole
}

export interface RegisterPayload {
  username: string
  password: string
  email?: string
  company?: string
  telephone?: string
  role?: AppRole
}

function getAuthPath(path: string): string {
  return `/api/auth${path}`
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const url = getAuthPath('/login')
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify({ username, password })
  })

  const body = await res.json().catch(() => ({})) as { message?: string }

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(body?.message ?? 'Invalid username or password')
    }
    throw new Error(body?.message ?? res.statusText ?? 'Login failed')
  }

  const data = body as LoginResponse
  if (!data.authenticated || !data.username || !data.role) {
    throw new Error('Invalid login response')
  }

  return data
}

export async function register(payload: RegisterPayload): Promise<{ username: string; role: AppRole }> {
  const url = getAuthPath('/register')
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(payload)
  })

  const body = await res.json().catch(() => ({})) as { message?: string; username?: string; role?: string }

  if (!res.ok) {
    if (res.status === 409) {
      throw new Error(body?.message ?? 'Username already exists')
    }
    if (res.status === 400) {
      throw new Error(body?.message ?? 'Invalid input or weak password')
    }
    throw new Error(body?.message ?? res.statusText ?? 'Registration failed')
  }

  if (res.status === 201) {
    return { username: payload.username, role: (payload.role ?? 'Customer') as AppRole }
  }

  throw new Error('Registration failed')
}

import type { AppRole } from '../types'
import { API_BASE_URL } from '../utils/constants'

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

function getAuthEndpoint(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, '')
  return `${base}/api/auth${path}`
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const url = getAuthEndpoint('/login')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const url = getAuthEndpoint('/register')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

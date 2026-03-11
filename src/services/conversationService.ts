import type { ApiConversation } from '../types'
import { API_BASE_URL } from '../utils/constants'

export async function listConversations(username: string): Promise<ApiConversation[]> {
  const base = API_BASE_URL.replace(/\/$/, '')
  const url = `${base}/api/conversations?username=${encodeURIComponent(username)}`
  const res = await fetch(url)

  const body = await res.json().catch(() => ({})) as { message?: string; code?: string }

  if (!res.ok) {
    if (res.status === 400) {
      throw new Error(body?.message ?? 'Username is required')
    }
    throw new Error(body?.message ?? res.statusText ?? 'Failed to fetch conversations')
  }

  return Array.isArray(body) ? body : []
}

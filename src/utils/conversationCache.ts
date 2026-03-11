import type { Citation, EscalationInfo } from '../types'
import { STORAGE_KEYS } from './constants'

const MAX_CACHED = 100

export interface CachedConversation {
  requestId: string
  conversationId: string
  userMessage: string
  assistantMessage: string
  citations?: Citation[]
  ticketId?: string
  escalation?: EscalationInfo
  outcome: string
  issueType: string
  requestType?: string
  createdAtUtc: string
}

function getCache(): Record<string, CachedConversation> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONVERSATION_CACHE)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, CachedConversation>
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function setCache(cache: Record<string, CachedConversation>): void {
  try {
    const keys = Object.keys(cache)
    if (keys.length > MAX_CACHED) {
      const sorted = keys
        .map((k) => ({ k, t: cache[k]?.createdAtUtc ?? '' }))
        .sort((a, b) => (a.t > b.t ? 1 : -1))
      const toRemove = sorted.slice(0, keys.length - MAX_CACHED).map((x) => x.k)
      toRemove.forEach((k) => delete cache[k])
    }
    localStorage.setItem(STORAGE_KEYS.CONVERSATION_CACHE, JSON.stringify(cache))
  } catch {
    // ignore
  }
}

export function saveConversation(entry: CachedConversation): void {
  const cache = getCache()
  cache[entry.requestId] = entry
  setCache(cache)
}

export function getConversation(requestId: string): CachedConversation | null {
  const cache = getCache()
  return cache[requestId] ?? null
}

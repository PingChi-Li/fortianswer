import { useState, useEffect } from 'react'
import { STORAGE_KEYS } from '../utils/constants'

function createConversationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `conv-${crypto.randomUUID()}`
  }
  return `conv-${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function useSession() {
  const [sessionId, setSessionId] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.CHAT_SESSION)
    if (stored) return stored
    const next = createConversationId()
    localStorage.setItem(STORAGE_KEYS.CHAT_SESSION, next)
    return next
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHAT_SESSION, sessionId)
  }, [sessionId])

  const setConversationId = (conversationId: string | null | undefined) => {
    if (!conversationId) return
    setSessionId(conversationId)
  }

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEYS.CHAT_SESSION)
    const newSessionId = createConversationId()
    localStorage.setItem(STORAGE_KEYS.CHAT_SESSION, newSessionId)
    setSessionId(newSessionId)
  }

  return { sessionId, clearSession, setConversationId }
}

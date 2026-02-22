import { useState, useEffect } from 'react'
import { STORAGE_KEYS } from '../utils/constants'

export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    // Generate or retrieve session ID
    const stored = localStorage.getItem(STORAGE_KEYS.CHAT_SESSION)
    if (stored) {
      setSessionId(stored)
    } else {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem(STORAGE_KEYS.CHAT_SESSION, newSessionId)
      setSessionId(newSessionId)
    }
  }, [])

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEYS.CHAT_SESSION)
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem(STORAGE_KEYS.CHAT_SESSION, newSessionId)
    setSessionId(newSessionId)
  }

  return { sessionId, clearSession }
}

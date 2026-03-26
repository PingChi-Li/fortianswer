import type { AppRole, ChatApiRequest, ChatApiResponse } from '../types'
import { apiFetch } from './apiClient'

export interface SendChatOptions {
  correlationId?: string
  role: AppRole
}

function getChatPath(): string {
  return '/api/chat'
}

export interface ChatServiceError {
  status: number
  message: string
  requestId?: string
  isTokenExpiration?: boolean
}

function isTokenExpirationError(message: string): boolean {
  const lower = (message || '').toLowerCase()
  return lower.includes('token') && (lower.includes('expir') || lower.includes('expired'))
}

export async function sendChatRequest(
  request: ChatApiRequest,
  options: SendChatOptions
): Promise<ChatApiResponse> {
  const { correlationId, role } = options
  const headers: Record<string, string> = {
    'x-user-role': role
  }
  if (correlationId) {
    headers['x-correlation-id'] = correlationId
  }

  const res = await apiFetch(getChatPath(), {
    method: 'POST',
    headers,
    body: JSON.stringify(request)
  })

  let body: unknown
  try {
    body = await res.json().catch(() => ({}))
  } catch {
    body = {}
  }

  const requestId = (body as { requestId?: string })?.requestId
  if (requestId) {
    console.debug('[chat] requestId:', requestId)
  }

  if (!res.ok) {
    const message = (body as { message?: string })?.message ?? res.statusText ?? 'Request failed'
    const err: ChatServiceError = {
      status: res.status,
      message,
      requestId,
      isTokenExpiration: res.status === 400 && isTokenExpirationError(message)
    }
    throw err
  }

  const b = body as Record<string, unknown>
  const optionalWebSearchToken =
    (b.optionalWebSearchToken as string | undefined) ??
    ((b.next as Record<string, unknown>)?.optional_web_search as string | undefined)
  return { ...b, optionalWebSearchToken: optionalWebSearchToken || undefined } as ChatApiResponse
}

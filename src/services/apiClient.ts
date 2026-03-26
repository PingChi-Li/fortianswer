import { API_BASE_URL } from '../utils/constants'

const _env = (import.meta as { env?: Record<string, string> }).env

/** Sprint 3: all Function App routes require x-api-key. Override via VITE_API_KEY in .env */
export function getApiKey(): string {
  return _env?.VITE_API_KEY ?? 'fortianswer-t6-2026'
}

export function getApiBaseUrl(): string {
  return API_BASE_URL.replace(/\/$/, '')
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

function parseErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const b = body as { message?: string; error?: { message?: string; code?: string } }
    if (b.error?.message) return b.error.message
    if (b.message) return b.message
  }
  return fallback
}

export interface ApiFetchOptions extends RequestInit {
  /** Skip JSON Content-Type (e.g. for octet-stream upload) */
  skipJsonContentType?: boolean
}

/**
 * Central fetch for Azure Functions. Adds x-api-key and default JSON headers.
 */
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { skipJsonContentType, headers: userHeaders, ...rest } = options
  const base = getApiBaseUrl()
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`

  const headers = new Headers(userHeaders as HeadersInit)
  headers.set('x-api-key', getApiKey())
  if (!skipJsonContentType && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(url, { ...rest, headers })

  if (res.status === 429) {
    throw new ApiClientError('Too many requests. Please try again in a moment.', 429, 'TooManyRequests')
  }

  return res
}

/**
 * JSON helper: throws ApiClientError on non-OK with parsed message.
 */
export async function apiFetchJson<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const res = await apiFetch(path, options)
  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    const msg = parseErrorMessage(body, res.statusText ?? 'Request failed')
    const code = (body as { error?: { code?: string } })?.error?.code
    throw new ApiClientError(msg, res.status, code)
  }

  return body as T
}

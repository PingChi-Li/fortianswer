import { API_BASE_URL, DEBUG_VIEW_KEY } from '../utils/constants'

export interface DebugApiResponse {
  debugJson: unknown
}

/**
 * Fetches debug information for a chat request.
 * Requires X-Debug-Key header (dev/internal use only).
 */
export async function fetchDebugInfo(requestId: string): Promise<DebugApiResponse> {
  const base = API_BASE_URL.replace(/\/$/, '')
  const url = `${base}/api/debug/${encodeURIComponent(requestId)}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Debug-Key': DEBUG_VIEW_KEY
    }
  })

  if (!res.ok) {
    const message = (await res.json().catch(() => ({})) as { message?: string })?.message ?? res.statusText ?? 'Failed to fetch debug info'
    throw new Error(message)
  }

  return res.json() as Promise<DebugApiResponse>
}

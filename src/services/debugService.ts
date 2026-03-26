import { DEBUG_VIEW_KEY } from '../utils/constants'
import { apiFetch } from './apiClient'

export interface DebugApiResponse {
  debugJson: unknown
}

/**
 * Fetches debug information for a chat request.
 * Requires X-Debug-Key header (dev/internal use only).
 */
export async function fetchDebugInfo(requestId: string): Promise<DebugApiResponse> {
  const path = `/api/debug/${encodeURIComponent(requestId)}`

  const res = await apiFetch(path, {
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

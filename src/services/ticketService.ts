import type { ApiTicket } from '../types'
import { apiFetch, apiFetchJson } from './apiClient'

export interface CreateTicketPayload {
  username: string
  summary: string
  issueType?: string
  dataBoundary?: string
  conversationId?: string
}

export interface CreateTicketResponse {
  ticketId: string
  status: string
  priority: string
  issueType: string
  dataBoundary: string
  createdByUser: string
  conversationId?: string
  createdUtc: string
}

/** Sprint 3: GET /api/tickets/all paginated response */
export interface TicketsAllResponse {
  total: number
  page: number
  pageSize: number
  totalPages: number
  tickets: ApiTicket[]
}

export type TicketApiRole = 'agent' | 'admin'

export interface ListTicketsAllParams {
  role: TicketApiRole
  page?: number
  pageSize?: number
  status?: string
  priority?: string
  issueType?: string
  assignedTo?: string
}

export interface PatchTicketBody {
  status?: string
  assignedTo?: string | null
  priority?: string
}

function getTicketsPath(): string {
  return '/api/tickets'
}

export async function createTicket(payload: CreateTicketPayload): Promise<CreateTicketResponse> {
  const res = await apiFetch(getTicketsPath(), {
    method: 'POST',
    body: JSON.stringify(payload)
  })

  const body = await res.json().catch(() => ({})) as { message?: string }

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(body?.message ?? 'Unauthorized')
    }
    if (res.status === 400) {
      throw new Error(body?.message ?? 'Invalid input')
    }
    throw new Error(body?.message ?? res.statusText ?? 'Failed to create ticket')
  }

  return body as CreateTicketResponse
}

export async function getTicket(ticketId: string): Promise<ApiTicket> {
  const path = `/api/tickets/${encodeURIComponent(ticketId)}`
  const res = await apiFetch(path)

  const body = await res.json().catch(() => ({})) as { message?: string }

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(body?.message ?? 'Ticket not found')
    }
    throw new Error(body?.message ?? res.statusText ?? 'Failed to fetch ticket')
  }

  return body as ApiTicket
}

/** Customer: own tickets only (array response). */
export async function listTicketsByUser(username: string): Promise<ApiTicket[]> {
  const path = `${getTicketsPath()}?username=${encodeURIComponent(username)}`
  const res = await apiFetch(path)

  const body = await res.json().catch(() => ({})) as { message?: string; code?: string }

  if (!res.ok) {
    if (res.status === 400) {
      throw new Error(body?.message ?? 'Username is required')
    }
    throw new Error(body?.message ?? res.statusText ?? 'Failed to fetch tickets')
  }

  return Array.isArray(body) ? body : []
}

/** Agent/Admin: paginated all tickets (Sprint 3). */
export async function listTicketsAll(params: ListTicketsAllParams): Promise<TicketsAllResponse> {
  const q = new URLSearchParams()
  q.set('role', params.role)
  if (params.page != null && params.page > 0) q.set('page', String(params.page))
  if (params.pageSize != null && params.pageSize > 0) q.set('pageSize', String(params.pageSize))
  if (params.status) q.set('status', params.status)
  if (params.priority) q.set('priority', params.priority)
  if (params.issueType) q.set('issueType', params.issueType)
  if (params.assignedTo) q.set('assignedTo', params.assignedTo)

  return apiFetchJson<TicketsAllResponse>(`/api/tickets/all?${q.toString()}`)
}

/**
 * Sprint 3: PATCH /api/tickets/{id}?role=agent|admin
 */
export async function patchTicket(
  ticketId: string,
  role: TicketApiRole,
  body: PatchTicketBody
): Promise<ApiTicket> {
  const path = `/api/tickets/${encodeURIComponent(ticketId)}?role=${role}`
  return apiFetchJson<ApiTicket>(path, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
}

/** @deprecated Use patchTicket — kept for any legacy callers */
export async function updateTicketStatus(ticketId: string, status: string, role: TicketApiRole = 'agent'): Promise<ApiTicket> {
  return patchTicket(ticketId, role, { status })
}

/** Admin: remove ticket (backend must support DELETE). */
export async function deleteTicket(ticketId: string, role: TicketApiRole): Promise<void> {
  const path = `/api/tickets/${encodeURIComponent(ticketId)}?role=${role}`
  await apiFetchJson<unknown>(path, { method: 'DELETE' })
}

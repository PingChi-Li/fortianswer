import type { ApiTicket } from '../types'
import { API_BASE_URL } from '../utils/constants'

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

function getTicketsEndpoint(): string {
  const base = API_BASE_URL.replace(/\/$/, '')
  return `${base}/api/tickets`
}

export async function createTicket(payload: CreateTicketPayload): Promise<CreateTicketResponse> {
  const url = getTicketsEndpoint()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const base = API_BASE_URL.replace(/\/$/, '')
  const url = `${base}/api/tickets/${encodeURIComponent(ticketId)}`
  const res = await fetch(url)

  const body = await res.json().catch(() => ({})) as { message?: string }

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(body?.message ?? 'Ticket not found')
    }
    throw new Error(body?.message ?? res.statusText ?? 'Failed to fetch ticket')
  }

  return body as ApiTicket
}

export async function listTicketsByUser(username: string): Promise<ApiTicket[]> {
  const base = API_BASE_URL.replace(/\/$/, '')
  const url = `${base}/api/tickets?username=${encodeURIComponent(username)}`
  const res = await fetch(url)

  const body = await res.json().catch(() => ({})) as { message?: string; code?: string }

  if (!res.ok) {
    if (res.status === 400) {
      throw new Error(body?.message ?? 'Username is required')
    }
    throw new Error(body?.message ?? res.statusText ?? 'Failed to fetch tickets')
  }

  return Array.isArray(body) ? body : []
}

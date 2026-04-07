import { useCallback, useEffect, useState } from 'react'
import type { AppRole } from '../types'
import { getFeedbackSummary, getFlaggedFeedback, type FeedbackSummaryResponse } from '../services/feedbackService'
import { listTicketsAll, type TicketApiRole } from '../services/ticketService'
import type { ApiTicket } from '../types'
import { ApiClientError } from '../services/apiClient'

export interface IssueTypeVolume {
  issueType: string
  totalRatings: number
  up: number
  down: number
  satisfactionRate: number
}

export interface EscalationStats {
  autoTickets: number
  manualTickets: number
  totalTickets: number
  escalationRate: number | null
}

export interface AnalyticsDataState {
  feedback: FeedbackSummaryResponse | null
  flaggedTotal: number
  tickets: ApiTicket[]
  issueTypesFromFeedback: IssueTypeVolume[]
  escalation: EscalationStats
  ticketsByIssueType: { issueType: string; count: number }[]
  loadError: string
  loading: boolean
}

function roleToTicketRole(role: AppRole): TicketApiRole {
  return role === 'Admin' ? 'admin' : 'agent'
}

function roleToFeedbackRole(role: AppRole): 'admin' | 'agent' {
  return role === 'Admin' ? 'admin' : 'agent'
}

function aggregateTickets(tickets: ApiTicket[]): EscalationStats {
  let autoTickets = 0
  let manualTickets = 0
  for (const t of tickets) {
    if (t.source === 'auto') autoTickets += 1
    else manualTickets += 1
  }
  const totalTickets = autoTickets + manualTickets
  const escalationRate =
    totalTickets > 0 ? Math.round((autoTickets / totalTickets) * 1000) / 10 : null
  return { autoTickets, manualTickets, totalTickets, escalationRate }
}

function ticketsByIssueType(tickets: ApiTicket[]): { issueType: string; count: number }[] {
  const map = new Map<string, number>()
  for (const t of tickets) {
    const k = t.issueType || 'Unknown'
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([issueType, count]) => ({ issueType, count }))
    .sort((a, b) => b.count - a.count)
}

export function useAnalyticsData(role: AppRole | null) {
  const [state, setState] = useState<AnalyticsDataState>({
    feedback: null,
    flaggedTotal: 0,
    tickets: [],
    issueTypesFromFeedback: [],
    escalation: { autoTickets: 0, manualTickets: 0, totalTickets: 0, escalationRate: null },
    ticketsByIssueType: [],
    loadError: '',
    loading: true
  })

  const load = useCallback(async () => {
    if (!role || (role !== 'Agent' && role !== 'Admin')) {
      setState((s) => ({ ...s, loading: false }))
      return
    }
    setState((s) => ({ ...s, loading: true, loadError: '' }))
    const ticketRole = roleToTicketRole(role)
    const fr = roleToFeedbackRole(role)
    try {
      const [feedback, flagged, ticketsPage] = await Promise.all([
        getFeedbackSummary(fr),
        getFlaggedFeedback(fr),
        listTicketsAll({ role: ticketRole, page: 1, pageSize: 500 })
      ])
      const tickets = ticketsPage.tickets ?? []
      const issueTypesFromFeedback: IssueTypeVolume[] = (feedback.byIssueType ?? []).map((row) => ({
        issueType: row.issueType,
        totalRatings: (row.up ?? 0) + (row.down ?? 0),
        up: row.up ?? 0,
        down: row.down ?? 0,
        satisfactionRate: row.satisfactionRate ?? 0
      }))
      const escalation = aggregateTickets(tickets)
      const byIssue = ticketsByIssueType(tickets)
      setState({
        feedback,
        flaggedTotal: flagged.total ?? (flagged.items?.length ?? 0),
        tickets,
        issueTypesFromFeedback,
        escalation,
        ticketsByIssueType: byIssue,
        loadError: '',
        loading: false
      })
    } catch (e) {
      const msg =
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to load analytics'
      setState((s) => ({
        ...s,
        loadError: msg,
        loading: false
      }))
    }
  }, [role])

  useEffect(() => {
    void load()
  }, [load])

  return { ...state, reload: load }
}

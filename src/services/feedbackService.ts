import { apiFetchJson } from './apiClient'

export interface SubmitFeedbackPayload {
  requestId: string
  username: string
  rating: 'up' | 'down'
  issueType?: string
  citations?: string[]
}

export async function submitChatFeedback(payload: SubmitFeedbackPayload): Promise<void> {
  await apiFetchJson<unknown>('/api/feedback', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export interface FeedbackSummaryResponse {
  totalUp: number
  totalDown: number
  totalRatings: number
  satisfactionRate: number
  byIssueType: { issueType: string; up: number; down: number; satisfactionRate: number }[]
  byCitation: {
    documentId: string
    fileName: string
    up: number
    down: number
    totalRatings: number
    satisfactionRate: number
  }[]
}

export type FeedbackApiRole = 'admin' | 'agent'

export async function getFeedbackSummary(role: FeedbackApiRole = 'admin'): Promise<FeedbackSummaryResponse> {
  return apiFetchJson<FeedbackSummaryResponse>(`/api/feedback/summary?role=${role}`)
}

export interface FlaggedFeedbackItem {
  requestId: string
  username: string
  issueType: string
  citations: string[]
  createdUtc: string
}

export interface FlaggedFeedbackResponse {
  total: number
  items: FlaggedFeedbackItem[]
}

export async function getFlaggedFeedback(role: FeedbackApiRole = 'admin'): Promise<FlaggedFeedbackResponse> {
  return apiFetchJson<FlaggedFeedbackResponse>(`/api/feedback/flagged?role=${role}`)
}

export async function dismissFeedback(
  requestId: string,
  role: FeedbackApiRole = 'admin'
): Promise<{ dismissed: boolean }> {
  return apiFetchJson<{ dismissed: boolean }>(
    `/api/feedback/${encodeURIComponent(requestId)}/dismiss?role=${role}`,
    { method: 'PATCH', body: '{}' }
  )
}

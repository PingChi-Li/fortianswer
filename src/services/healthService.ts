import { apiFetchJson } from './apiClient'

export interface HealthResponse {
  status: string
  checks?: {
    tableStorage?: string
    search?: string
    groq?: string
  }
  timestamp?: string
}

export async function getHealth(): Promise<HealthResponse> {
  return apiFetchJson<HealthResponse>('/api/health')
}

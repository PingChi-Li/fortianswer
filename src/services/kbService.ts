import { apiFetch, apiFetchJson } from './apiClient'

export type KbClassification = 'public' | 'internal' | 'confidential' | 'restricted'

export interface KbDocument {
  path: string
  source: string
  classification: string
  createdUtc: string
  chunkCount: number
}

export interface KbDocumentsResponse {
  total: number
  documents: KbDocument[]
}

export async function listKbDocuments(role: 'admin' | 'agent' = 'admin', classification?: string): Promise<KbDocumentsResponse> {
  const q = new URLSearchParams({ role })
  if (classification) q.set('classification', classification)
  return apiFetchJson<KbDocumentsResponse>(`/api/kb/documents?${q.toString()}`)
}

export interface UploadDocumentResponse {
  blobPath: string
  filename: string
  classification: string
  message: string
}

export async function uploadKbDocument(file: File, classification: KbClassification = 'public'): Promise<UploadDocumentResponse> {
  const path = `/api/documents/upload?role=admin&classification=${encodeURIComponent(classification)}&filename=${encodeURIComponent(file.name)}`
  const res = await apiFetch(path, {
    method: 'POST',
    skipJsonContentType: true,
    headers: { 'Content-Type': 'application/octet-stream' },
    body: file
  })

  const body = await res.json().catch(() => ({})) as { message?: string }

  if (!res.ok) {
    throw new Error(body?.message ?? res.statusText ?? 'Upload failed')
  }

  return body as UploadDocumentResponse
}

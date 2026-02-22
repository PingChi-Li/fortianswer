// Request Types
export type RequestType = 
  | 'phishing'
  | 'suspicious_login'
  | 'vpn'
  | 'mfa'
  | 'endpoint_alert'

// Message Types
export type MessageRole = 'user' | 'assistant'

export type MessageStatus = 
  | 'retrieving'
  | 'generating'
  | 'error'
  | 'no-answer'
  | 'complete'

export interface Citation {
  id: string
  sourceName: string
  link?: string
  /** URL or internal document ID; when set, used for URL vs "Internal document" display */
  urlOrId?: string
  section?: string
  content?: string
  securityClassification?: string
  snippet?: string
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  status?: MessageStatus
  citations?: Citation[]
  timestamp: Date
  requestType?: RequestType
}

// Feedback Types
export type FeedbackReasonCategory = 'hallucination' | 'outdated' | 'harmful'

export interface MessageFeedback {
  messageId: string
  helpful: boolean | null
  solved: boolean
  reasonForFailure?: string
  reasonCategory?: FeedbackReasonCategory
}

// FAQ Types
export interface FAQ {
  id: string
  question: string
  answer: string
  category?: string
  published: boolean
  suspended: boolean
  createdAt: Date
  updatedAt: Date
}

// Policy Types
export interface Policy {
  id: string
  title: string
  content: string
  category?: string
  published: boolean
  suspended: boolean
  createdAt: Date
  updatedAt: Date
}

// Knowledge Base (unified)
export type KnowledgeCategory = 'Network' | 'Physical' | 'Compliance'

export interface VersionHistoryEntry {
  author: string
  change: string
  date: Date
}

export type KnowledgeItemType = 'faq' | 'policy'

export interface KnowledgeItem {
  id: string
  type: KnowledgeItemType
  title: string
  content: string
  category?: KnowledgeCategory
  author: string
  tags: string[]
  lastUpdated: Date
  versionHistory?: VersionHistoryEntry[]
}

// Ticket Types
export interface Ticket {
  id: string
  title: string
  description: string
  requestType?: RequestType
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdAt: Date
  updatedAt: Date
}

// Azure Chat API Types
export interface ChatApiRequest {
  message: string
  conversationId?: string
  userRole: 'User' | 'Admin'
  userGroup?: string
  confirmWebSearch?: boolean
  webSearchToken?: string
}

export interface ApiCitation {
  title?: string
  urlOrId: string
  snippet?: string
}

export interface ChatApiResponse {
  answer: string
  citations?: ApiCitation[]
  needsWebConfirmation?: boolean
  webSearchToken?: string
  requestId?: string
}

// API Response Types
export interface ChatResponse {
  message: string
  citations?: Citation[]
  status: MessageStatus
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
}

// Admin Settings
export interface AdminSettings {
  profile: {
    name: string
    email: string
    role: string
  }
  theme: 'light' | 'dark' | 'auto'
  features: {
    chat: boolean
    faq: boolean
    policy: boolean
    tickets: boolean
    escalation: boolean
  }
}

// Admin: User Management
export type UserRole = 'Admin' | 'Analyst' | 'Viewer'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: UserRole
  group: string
}

// Admin: RAG Configuration
export interface RAGConfig {
  systemPrompt: string
  temperature: number
}

// Admin: Audit Log
export interface AuditLogEntry {
  id: string
  user: string
  query: string
  timestamp: Date
}

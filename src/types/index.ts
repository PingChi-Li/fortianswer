// App Roles and Data Boundaries
export type AppRole = 'Customer' | 'Agent' | 'Admin'

export type DataBoundary = 'Public' | 'Internal' | 'Confidential'

export const ROLE_TO_DATA_BOUNDARY: Record<AppRole, DataBoundary> = {
  Customer: 'Public',
  Agent: 'Internal',
  Admin: 'Confidential'
}

// Request Types (UI selection)
export type RequestType =
  | 'phishing'
  | 'suspicious_login'
  | 'vpn'
  | 'mfa'
  | 'endpoint_alert'
  | 'password_reset'
  | 'account_lockout'
  | 'severity'
  | 'general'

// Issue Types (backend API format)
export type IssueType =
  | 'VPN'
  | 'MFA'
  | 'PasswordReset'
  | 'Phishing'
  | 'AccountLockout'
  | 'EndpointAlert'
  | 'SuspiciousLogin'
  | 'Severity'
  | 'General'

export const REQUEST_TYPE_TO_ISSUE_TYPE: Record<RequestType, IssueType> = {
  phishing: 'Phishing',
  suspicious_login: 'SuspiciousLogin',
  vpn: 'VPN',
  mfa: 'MFA',
  endpoint_alert: 'EndpointAlert',
  password_reset: 'PasswordReset',
  account_lockout: 'AccountLockout',
  severity: 'Severity',
  general: 'General'
}

// Message Types
export type MessageRole = 'user' | 'assistant'

export type MessageStatus = 
  | 'retrieving'
  | 'generating'
  | 'error'
  | 'no-answer'
  | 'complete'
  | 'escalated'

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
  score?: number
}

export interface EscalationInfo {
  shouldEscalate: boolean
  reason?: string
}

export interface OptionalWebSearch {
  userMessage: string
  webSearchToken?: string
}

export interface SlotFillingState {
  isActive: boolean
  currentStep?: number
  totalSteps?: number
  nextQuestion?: string
  slotKey?: string
  hint?: string
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  status?: MessageStatus
  citations?: Citation[]
  timestamp: Date
  requestType?: RequestType
  /** For escalated messages */
  escalation?: EscalationInfo
  requestId?: string
  /** When next.action === "escalate", ticket was auto-created */
  ticketId?: string
  actionHints?: string[]
  /** For Customer role when needsWebConfirmation is false: optional web search button */
  optionalWebSearch?: OptionalWebSearch
  /** Guided incident intake metadata for slot filling mode */
  slotFilling?: SlotFillingState
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

// Ticket Types (legacy UI)
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

// API Conversation (backend format)
export interface ApiConversation {
  requestId: string
  conversationId: string
  username: string
  outcome: 'answered' | 'escalated' | 'needs_web_confirmation' | 'error'
  issueType: string
  ticketId: string | null
  createdAtUtc: string
}

// API Ticket (backend format)
export interface ApiTicket {
  ticketId: string
  conversationId?: string | null
  status: string
  priority: string
  issueType: string
  dataBoundary: string
  createdByUser: string
  assignedTo?: string | null
  summary: string
  escalationReason?: string
  source: 'manual' | 'auto'
  createdUtc: string
  updatedUtc: string
}

// Azure Chat API Types
export interface ChatApiRequest {
  message: string
  issueType?: IssueType | string
  userRole?: AppRole
  username?: string
  dataBoundary?: DataBoundary
  conversationId?: string
  confirmWebSearch?: boolean
  webSearchToken?: string | null
}

export interface ApiCitation {
  title?: string
  /** Alternate field names from Azure API for document title */
  documentTitle?: string
  sourceTitle?: string
  name?: string
  urlOrId: string
  snippet?: string
  score?: number
}

export interface ChatNextAction {
  action: 'none' | 'escalate' | 'slot_filling' | 'suggest_escalate'
  ticketId?: string
}

export interface ChatApiResponse {
  answer: string
  citations?: ApiCitation[]
  needsWebConfirmation?: boolean
  webSearchToken?: string
  /** When needsWebConfirmation is false, API may return this for optional web search */
  optionalWebSearchToken?: string
  requestId?: string
  conversationId?: string
  next?: ChatNextAction
  escalation?: EscalationInfo
  actionHints?: string[]
  slotFilling?: SlotFillingState
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

// Admin: User Management (aligned with AppRole for scenario: Admin, Jane/Agent, Bob/Customer)
export interface AdminUser {
  id: string
  name: string
  email: string
  role: AppRole
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

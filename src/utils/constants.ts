import { RequestType } from '../types'

export const REQUEST_TYPES: { value: RequestType; label: string; description: string }[] = [
  {
    value: 'phishing',
    label: 'Phishing',
    description: 'Report and get help with suspicious emails or phishing attempts'
  },
  {
    value: 'suspicious_login',
    label: 'Suspicious Login',
    description: 'Investigate unusual login activity or account access concerns'
  },
  {
    value: 'vpn',
    label: 'VPN',
    description: 'Get assistance with VPN connection issues and configuration'
  },
  {
    value: 'mfa',
    label: 'MFA',
    description: 'Help with Multi-Factor Authentication setup and troubleshooting'
  },
  {
    value: 'endpoint_alert',
    label: 'Endpoint Alert',
    description: 'Review and respond to endpoint security alerts and notifications'
  }
]

const _env = (import.meta as { env?: Record<string, string> }).env
const DEFAULT_API_BASE = 'https://func-fortianswer-gccvakhgayenbdak.canadacentral-01.azurewebsites.net'
export const API_BASE_URL = _env?.VITE_API_BASE_URL || DEFAULT_API_BASE

export const APP_VERSION = _env?.VITE_APP_VERSION ?? 'v2.4.1'

/** When false or unset, hide debug UI (e.g. brown area with Azure response attributes). Set VITE_SHOW_DEBUG=true for development. */
export const SHOW_DEBUG_UI = _env?.VITE_SHOW_DEBUG === 'true'

/** Key for X-Debug-Key header when fetching /api/debug/{requestId}. From backend Azure App Settings. */
export const DEBUG_VIEW_KEY = _env?.VITE_DEBUG_VIEW_KEY ?? 'dev-only-123'

export const STORAGE_KEYS = {
  CHAT_SESSION: 'fortianswer_chat_session',
  ADMIN_SETTINGS: 'fortianswer_admin_settings',
  THEME: 'fortianswer_theme',
  SIDEBAR_COLLAPSED: 'fortianswer_sidebar_collapsed',
  RECENT_ACTIVITY: 'fortianswer_recent_activity',
  RAG_CONFIG: 'fortianswer_rag_config',
  ROLE: 'fortianswer_role',
  AUTH_SESSION: 'fortianswer_auth'
}

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { AdminSettings, AdminUser, RAGConfig, AuditLogEntry } from '../types'
import { STORAGE_KEYS } from '../utils/constants'
import { getHealth, type HealthResponse } from '../services/healthService'
import {
  getFeedbackSummary,
  getFlaggedFeedback,
  dismissFeedback,
  type FeedbackSummaryResponse,
  type FlaggedFeedbackItem
} from '../services/feedbackService'
import {
  listKbDocuments,
  uploadKbDocument,
  deleteKbDocument,
  type KbClassification,
  type KbDocument
} from '../services/kbService'
import { ApiClientError } from '../services/apiClient'
import { formatSatisfactionPercent } from '../utils/satisfactionDisplay'
import { applyTheme, normalizeThemeValue, persistTheme } from '../utils/theme'

const MOCK_USERS: AdminUser[] = [
  { id: '1', name: 'Admin', email: 'admin@company.com', role: 'Admin', group: 'Security-Admins' },
  { id: '2', name: 'Jane', email: 'jane@company.com', role: 'Agent', group: 'Security-Analysts' },
  { id: '3', name: 'Bob', email: 'bob@company.com', role: 'Customer', group: 'All-Employees' }
]

const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  { id: 'a1', user: 'user@company.com', query: 'How do I report phishing?', timestamp: new Date(Date.now() - 3600000) },
  { id: 'a2', user: 'jane@company.com', query: 'VPN connection issues', timestamp: new Date(Date.now() - 7200000) },
  { id: 'a3', user: 'bob@company.com', query: 'MFA setup instructions', timestamp: new Date(Date.now() - 86400000) }
]

const DEFAULT_RAG: RAGConfig = {
  systemPrompt: 'You are a helpful security assistant. Answer based only on the provided knowledge base. Be concise and accurate. Do not make up information.',
  temperature: 0.3
}

type AdminTab = 'users' | 'rag' | 'audit' | 'feedback' | 'kb'

export default function Admin() {
  const { role } = useAuth()
  const [tab, setTab] = useState<AdminTab>('users')
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthError, setHealthError] = useState('')

  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummaryResponse | null>(null)
  const [flaggedItems, setFlaggedItems] = useState<FlaggedFeedbackItem[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')
  const [dismissingId, setDismissingId] = useState<string | null>(null)

  const [kbDocs, setKbDocs] = useState<KbDocument[]>([])
  const [kbTotal, setKbTotal] = useState(0)
  const [kbClassificationFilter, setKbClassificationFilter] = useState('')
  const [kbLoading, setKbLoading] = useState(false)
  /** Background refetch (e.g. after upload) — keeps the table visible */
  const [kbRefreshing, setKbRefreshing] = useState(false)
  const [kbError, setKbError] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadClassification, setUploadClassification] = useState<KbClassification>('public')
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [kbDeletingPath, setKbDeletingPath] = useState<string | null>(null)
  const [settings, setSettings] = useState<AdminSettings>({
    profile: { name: 'Admin User', email: 'admin@company.com', role: 'Administrator' },
    theme: 'light'
  })
  const [ragConfig, setRagConfig] = useState<RAGConfig>(DEFAULT_RAG)
  const [auditLog] = useState<AuditLogEntry[]>(MOCK_AUDIT_LOG)

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((e) => setHealthError(e instanceof Error ? e.message : 'Health check failed'))
  }, [])

  const loadFeedback = useCallback(async () => {
    setFeedbackLoading(true)
    setFeedbackError('')
    try {
      const [sum, flagged] = await Promise.all([getFeedbackSummary(), getFlaggedFeedback()])
      setFeedbackSummary(sum)
      setFlaggedItems(flagged.items ?? [])
    } catch (e) {
      setFeedbackError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : 'Failed to load feedback')
    } finally {
      setFeedbackLoading(false)
    }
  }, [])

  const loadKb = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false
      if (silent) setKbRefreshing(true)
      else setKbLoading(true)
      setKbError('')
      try {
        const res = await listKbDocuments(
          'admin',
          kbClassificationFilter.trim() || undefined
        )
        setKbDocs(res.documents ?? [])
        setKbTotal(res.total ?? 0)
      } catch (e) {
        setKbError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : 'Failed to load documents')
      } finally {
        if (silent) setKbRefreshing(false)
        else setKbLoading(false)
      }
    },
    [kbClassificationFilter]
  )

  useEffect(() => {
    if (tab === 'feedback') void loadFeedback()
  }, [tab, loadFeedback])

  useEffect(() => {
    if (tab === 'kb') void loadKb()
  }, [tab, loadKb])

  const handleDismiss = async (requestId: string) => {
    setDismissingId(requestId)
    setFeedbackError('')
    try {
      await dismissFeedback(requestId)
      setFlaggedItems((prev) => prev.filter((x) => x.requestId !== requestId))
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : 'Dismiss failed')
    } finally {
      setDismissingId(null)
    }
  }

  const handleKbUpload = async (e: FormEvent) => {
    e.preventDefault()
    if (!uploadFile) {
      setUploadMessage('Choose a file')
      return
    }
    setUploading(true)
    setUploadMessage('')
    try {
      const res = await uploadKbDocument(uploadFile, uploadClassification)
      setUploadMessage(res.message ?? 'Uploaded successfully')
      setUploadFile(null)
      // Await refetch so the list updates in the same flow (fetch + setState = “partial page” update)
      await loadKb({ silent: true })
      // Indexing may lag; one more refresh shortly after often picks up the new document
      window.setTimeout(() => {
        void loadKb({ silent: true })
      }, 2500)
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleKbDelete = async (d: KbDocument) => {
    if (
      !window.confirm(
        `Delete this document from storage and search index?\n\n${d.path}\n\nThis cannot be undone.`
      )
    ) {
      return
    }
    setKbDeletingPath(d.path)
    setKbError('')
    try {
      await deleteKbDocument(d.path)
      await loadKb({ silent: true })
    } catch (e) {
      setKbError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setKbDeletingPath(null)
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_SETTINGS)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<AdminSettings>
        setSettings({
          profile: {
            name: 'Admin User',
            email: 'admin@company.com',
            role: 'Administrator',
            ...parsed.profile
          },
          theme: normalizeThemeValue(parsed.theme)
        })
      } catch (e) {
        console.error('Failed to load settings', e)
      }
    }
    const savedRag = localStorage.getItem(STORAGE_KEYS.RAG_CONFIG)
    if (savedRag) {
      try {
        setRagConfig(JSON.parse(savedRag))
      } catch {
        // ignore
      }
    }
  }, [])

  const handleSaveSettings = () => {
    const payload: AdminSettings = {
      profile: settings.profile,
      theme: settings.theme
    }
    localStorage.setItem(STORAGE_KEYS.ADMIN_SETTINGS, JSON.stringify(payload))
    applyTheme(settings.theme)
    persistTheme(settings.theme)
    alert('Settings saved successfully!')
  }

  const handleSaveRag = () => {
    localStorage.setItem(STORAGE_KEYS.RAG_CONFIG, JSON.stringify(ragConfig))
    alert('RAG configuration saved!')
  }

  const handleProfileChange = (field: string, value: string) => {
    setSettings({
      ...settings,
      profile: { ...settings.profile, [field]: value }
    })
  }

  const handleThemeChange = (theme: 'light' | 'dark') => {
    setSettings({ ...settings, theme })
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'users', label: 'User Management' },
    { id: 'rag', label: 'RAG Configuration' },
    { id: 'audit', label: 'Audit Logs' },
    { id: 'feedback', label: 'Feedback' },
    { id: 'kb', label: 'Knowledge Base' }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Admin Panel
      </h1>

      <div className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-2">API health</h2>
        {healthError ? (
          <p className="text-red-600 dark:text-red-400">{healthError}</p>
        ) : health ? (
          <div className="flex flex-wrap gap-4 text-gray-700 dark:text-gray-300">
            <span>
              Status:{' '}
              <span className="font-medium">{health.status ?? '—'}</span>
            </span>
            {health.checks && (
              <span className="text-xs">
                {Object.entries(health.checks).map(([k, v]) => (
                  <span key={k} className="mr-3">
                    {k}: {String(v)}
                  </span>
                ))}
              </span>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Loading…</p>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <h2 className="text-xl font-semibold p-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
              Users (Role & Group from Entra ID)
            </h2>
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Email</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Role</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Group</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {MOCK_USERS.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.group}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Personal Profile</h2>
            <div className="space-y-4">
              {(['name', 'email', 'role'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 capitalize">{field}</label>
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    value={settings.profile[field]}
                    onChange={(e) => handleProfileChange(field, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
              <div className="flex gap-6">
                {(['light', 'dark'] as const).map((theme) => (
                  <label key={theme} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="theme"
                      value={theme}
                      checked={settings.theme === theme}
                      onChange={() => handleThemeChange(theme)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700 dark:text-gray-300 capitalize">{theme}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 max-w-md">
                Click Save to apply. This controls light or dark appearance for FortiAnswer in this browser.
              </p>
            </div>
            <button
              onClick={handleSaveSettings}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

      {tab === 'rag' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-3xl">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">RAG Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                System Prompt (Personality & Rules)
              </label>
              <textarea
                value={ragConfig.systemPrompt}
                onChange={(e) => setRagConfig({ ...ragConfig, systemPrompt: e.target.value })}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="Define the bot's personality and rules..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Temperature: {ragConfig.temperature.toFixed(1)} (creativity vs precision)
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={ragConfig.temperature}
                onChange={(e) => setRagConfig({ ...ragConfig, temperature: parseFloat(e.target.value) })}
                className="w-full max-w-xs"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Precision</span>
                <span>Creativity</span>
              </div>
            </div>
            <button
              onClick={handleSaveRag}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save RAG Configuration
            </button>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <h2 className="text-xl font-semibold p-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
            Audit Logs (who asked what and when)
          </h2>
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">User</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Query</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {auditLog.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{entry.user}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{entry.query}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'feedback' && (
        <div className="space-y-8">
          {feedbackError && (
            <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
              {feedbackError}
            </div>
          )}
          {feedbackLoading ? (
            <p className="text-gray-600 dark:text-gray-400">Loading feedback…</p>
          ) : (
            <>
              {feedbackSummary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total ratings</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {feedbackSummary.totalRatings ?? '—'}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Satisfaction</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {feedbackSummary.satisfactionRate != null
                        ? formatSatisfactionPercent(feedbackSummary.satisfactionRate)
                        : '—'}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Thumbs up</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{feedbackSummary.totalUp ?? '—'}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Thumbs down</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{feedbackSummary.totalDown ?? '—'}</p>
                  </div>
                </div>
              )}

              {feedbackSummary?.byCitation && feedbackSummary.byCitation.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                  <h2 className="text-xl font-semibold p-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
                    By citation (document)
                  </h2>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="text-left px-4 py-3">File</th>
                        <th className="text-left px-4 py-3">Up</th>
                        <th className="text-left px-4 py-3">Down</th>
                        <th className="text-left px-4 py-3">Satisfaction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {feedbackSummary.byCitation.map((row) => (
                        <tr key={row.documentId ?? row.fileName}>
                          <td className="px-4 py-3 text-gray-900 dark:text-white">{row.fileName}</td>
                          <td className="px-4 py-3">{row.up}</td>
                          <td className="px-4 py-3">{row.down}</td>
                          <td className="px-4 py-3">
                            {row.satisfactionRate != null
                              ? formatSatisfactionPercent(row.satisfactionRate)
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <h2 className="text-xl font-semibold p-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
                  Flagged feedback
                </h2>
                {flaggedItems.length === 0 ? (
                  <p className="p-4 text-gray-600 dark:text-gray-400">No flagged items.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="text-left px-4 py-3">Request</th>
                        <th className="text-left px-4 py-3">User</th>
                        <th className="text-left px-4 py-3">Issue</th>
                        <th className="text-left px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {flaggedItems.map((row) => (
                        <tr key={row.requestId}>
                          <td className="px-4 py-3 font-mono text-xs">{row.requestId}</td>
                          <td className="px-4 py-3">{row.username}</td>
                          <td className="px-4 py-3">{row.issueType}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => void handleDismiss(row.requestId)}
                              disabled={dismissingId === row.requestId}
                              className="text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                            >
                              {dismissingId === row.requestId ? '…' : 'Dismiss'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'kb' && (
        <div className="space-y-6">
          <form
            onSubmit={handleKbUpload}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 max-w-xl"
          >
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Upload document</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">File</label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-600 dark:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Classification</label>
                <select
                  value={uploadClassification}
                  onChange={(e) => setUploadClassification(e.target.value as KbClassification)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="public">public</option>
                  <option value="internal">internal</option>
                  <option value="confidential">confidential</option>
                  <option value="restricted">restricted</option>
                </select>
              </div>
              {uploadMessage && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{uploadMessage}</p>
              )}
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </form>

          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Filter by classification</label>
              <input
                type="text"
                value={kbClassificationFilter}
                onChange={(e) => setKbClassificationFilter(e.target.value)}
                placeholder="e.g. public"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => void loadKb({ silent: true })}
              disabled={kbRefreshing}
              className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {kbRefreshing ? 'Refreshing…' : 'Refresh list'}
            </button>
          </div>

          {kbError && (
            <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
              {kbError}
            </div>
          )}

          {kbLoading ? (
            <p className="text-gray-600 dark:text-gray-400">Loading documents…</p>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden relative">
              {kbRefreshing && (
                <div
                  className="absolute inset-0 z-10 bg-white/60 dark:bg-gray-900/40 flex items-start justify-end p-3 pointer-events-none"
                  aria-hidden
                >
                  <span className="text-xs text-gray-600 dark:text-gray-300 bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded shadow">
                    Updating list…
                  </span>
                </div>
              )}
              <h2 className="text-xl font-semibold p-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
                Documents ({kbTotal})
                {kbRefreshing && <span className="sr-only"> — refreshing</span>}
              </h2>
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3">Path</th>
                    <th className="text-left px-4 py-3">Classification</th>
                    <th className="text-left px-4 py-3">Chunks</th>
                    <th className="text-left px-4 py-3">Created</th>
                    {role === 'Admin' && (
                      <th className="text-left px-4 py-3 w-28">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {kbDocs.map((d) => (
                    <tr key={d.path}>
                      <td className="px-4 py-3 font-mono text-xs break-all">{d.path}</td>
                      <td className="px-4 py-3">{d.classification}</td>
                      <td className="px-4 py-3">{d.chunkCount}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {d.createdUtc ? new Date(d.createdUtc).toLocaleString() : '—'}
                      </td>
                      {role === 'Admin' && (
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void handleKbDelete(d)}
                            disabled={kbDeletingPath === d.path || kbRefreshing}
                            className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                          >
                            {kbDeletingPath === d.path ? 'Deleting…' : 'Delete'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

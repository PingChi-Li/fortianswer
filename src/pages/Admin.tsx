import { useState, useEffect } from 'react'
import { AdminSettings, AdminUser, RAGConfig, AuditLogEntry } from '../types'
import { STORAGE_KEYS } from '../utils/constants'

const MOCK_USERS: AdminUser[] = [
  { id: '1', name: 'Admin User', email: 'admin@company.com', role: 'Admin', group: 'Security-Admins' },
  { id: '2', name: 'Jane Analyst', email: 'jane@company.com', role: 'Analyst', group: 'Security-Analysts' },
  { id: '3', name: 'Bob Viewer', email: 'bob@company.com', role: 'Viewer', group: 'All-Employees' }
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

type AdminTab = 'users' | 'rag' | 'audit'

export default function Admin() {
  const [tab, setTab] = useState<AdminTab>('users')
  const [settings, setSettings] = useState<AdminSettings>({
    profile: { name: 'Admin User', email: 'admin@company.com', role: 'Administrator' },
    theme: 'auto',
    features: { chat: true, faq: true, policy: true, tickets: true, escalation: true }
  })
  const [ragConfig, setRagConfig] = useState<RAGConfig>(DEFAULT_RAG)
  const [auditLog] = useState<AuditLogEntry[]>(MOCK_AUDIT_LOG)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_SETTINGS)
    if (saved) {
      try {
        setSettings(JSON.parse(saved))
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
    localStorage.setItem(STORAGE_KEYS.ADMIN_SETTINGS, JSON.stringify(settings))
    localStorage.setItem(STORAGE_KEYS.THEME, settings.theme)
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

  const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
    setSettings({ ...settings, theme })
  }

  const handleFeatureToggle = (feature: keyof AdminSettings['features']) => {
    setSettings({
      ...settings,
      features: { ...settings.features, [feature]: !settings.features[feature] }
    })
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'users', label: 'User Management' },
    { id: 'rag', label: 'RAG Configuration' },
    { id: 'audit', label: 'Audit Logs' }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Admin Panel
      </h1>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6">
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
              <div className="flex gap-4">
                {(['light', 'dark', 'auto'] as const).map((theme) => (
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
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Feature Flags</label>
              <div className="flex flex-wrap gap-4">
                {(Object.keys(settings.features) as (keyof AdminSettings['features'])[]).map((feature) => (
                  <label key={feature} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.features[feature]}
                      onChange={() => handleFeatureToggle(feature)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300 capitalize">{feature.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
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
    </div>
  )
}

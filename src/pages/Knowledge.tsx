import { useState, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { KnowledgeItem, KnowledgeCategory } from '../types'

const CATEGORIES: KnowledgeCategory[] = ['Network', 'Physical', 'Compliance']
const DATE_FILTERS = [
  { value: '', label: 'Any time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' }
]

const MOCK_ITEMS: KnowledgeItem[] = [
  {
    id: '1',
    type: 'policy',
    title: 'Phishing Prevention Policy',
    content: 'All employees must be vigilant about phishing attempts. Never click suspicious links or provide credentials via email. Report to security@company.com.',
    category: 'Compliance',
    author: 'Security Team',
    tags: ['phishing', 'email', 'security'],
    lastUpdated: new Date(Date.now() - 2 * 24 * 3600000),
    versionHistory: [
      { author: 'Security Team', change: 'Initial version', date: new Date(Date.now() - 30 * 24 * 3600000) },
      { author: 'Jane Doe', change: 'Updated reporting email', date: new Date(Date.now() - 2 * 24 * 3600000) }
    ]
  },
  {
    id: '2',
    type: 'policy',
    title: 'Network Access Control',
    content: 'Network access is restricted by role. VPN required for remote access. Unauthorized devices must not be connected to corporate network.',
    category: 'Network',
    author: 'IT Operations',
    tags: ['network', 'vpn', 'nac'],
    lastUpdated: new Date(Date.now() - 5 * 24 * 3600000),
    versionHistory: [
      { author: 'IT Operations', change: 'Created', date: new Date(Date.now() - 90 * 24 * 3600000) },
      { author: 'John Smith', change: 'Clarified VPN requirement', date: new Date(Date.now() - 5 * 24 * 3600000) }
    ]
  },
  {
    id: '3',
    type: 'faq',
    title: 'How do I report a phishing email?',
    content: 'Forward the suspicious email to security@company.com and do not click any links. Include the full headers if possible.',
    category: 'Compliance',
    author: 'System',
    tags: ['phishing', 'report'],
    lastUpdated: new Date(Date.now() - 1 * 24 * 3600000),
    versionHistory: [
      { author: 'System', change: 'Published', date: new Date(Date.now() - 60 * 24 * 3600000) }
    ]
  },
  {
    id: '4',
    type: 'policy',
    title: 'Physical Security Guidelines',
    content: 'Badge required for building access. Clean desk policy applies. Report lost badges immediately.',
    category: 'Physical',
    author: 'Facilities',
    tags: ['physical', 'badge', 'clean-desk'],
    lastUpdated: new Date(Date.now() - 14 * 24 * 3600000),
    versionHistory: [
      { author: 'Facilities', change: 'Updated clean desk policy', date: new Date(Date.now() - 14 * 24 * 3600000) }
    ]
  }
]

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export default function Knowledge() {
  const { role } = useAuth()
  const [items, setItems] = useState<KnowledgeItem[]>(() => MOCK_ITEMS.map((i) => ({ ...i })))
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<KnowledgeCategory | ''>('')
  const [dateFilter, setDateFilter] = useState('')
  const [selected, setSelected] = useState<KnowledgeItem | null>(null)
  const [detailTab, setDetailTab] = useState<'read' | 'history'>('read')
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')

  const filtered = useMemo(() => {
    let list = items
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    if (categoryFilter) {
      list = list.filter((item) => item.category === categoryFilter)
    }
    if (dateFilter) {
      const days = parseInt(dateFilter, 10)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)
      list = list.filter((item) => new Date(item.lastUpdated) >= cutoff)
    }
    return list
  }, [items, query, categoryFilter, dateFilter])

  const openDetail = (item: KnowledgeItem) => {
    setSelected(item)
    setEditContent(item.content)
    setDetailTab('read')
    setEditing(false)
  }

  const handleSaveEdit = () => {
    if (selected) {
      const updated = { ...selected, content: editContent, lastUpdated: new Date() }
      setSelected(updated)
      setItems((prev) => prev.map((i) => (i.id === selected.id ? updated : i)))
      setEditing(false)
    }
  }

  const handleDeleteFaq = () => {
    if (!selected || role !== 'Admin' || selected.type !== 'faq') return
    if (
      !window.confirm(
        `Delete this FAQ from the demo list?\n\n"${selected.title}"\n\nThis only removes it in your browser session (mock data).`
      )
    ) {
      return
    }
    const id = selected.id
    setItems((prev) => prev.filter((i) => i.id !== id))
    setSelected(null)
    setEditing(false)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Knowledge Base
      </h1>

      {/* Search and filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <input
          type="search"
          placeholder="Search policies and FAQs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-2xl mx-auto block px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white mb-4"
        />
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as KnowledgeCategory | '')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Modified</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              {DATE_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Results table */}
        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Title</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Last Updated</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Author</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => openDetail(item)}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      selected?.id === item.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{item.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(item.lastUpdated)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.author}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="p-6 text-center text-gray-500 dark:text-gray-400">No results found.</p>
            )}
          </div>
        </div>

        {/* Detail view */}
        <div className="lg:w-[420px] flex-shrink-0">
          {selected ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden sticky top-4">
              <div className="border-b border-gray-200 dark:border-gray-700 flex">
                <button
                  type="button"
                  onClick={() => setDetailTab('read')}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${
                    detailTab === 'read'
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  Content
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('history')}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${
                    detailTab === 'history'
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  Version History
                </button>
              </div>
              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {detailTab === 'read' && (
                  <>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{selected.title}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      {selected.author} · {formatDate(selected.lastUpdated)}
                    </p>
                    {editing ? (
                      <div>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={12}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditing(false); setEditContent(selected.content); }}
                            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {selected.content}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditing(true)}
                          className="mt-4 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 text-sm font-medium"
                        >
                          Edit
                        </button>
                        {role === 'Admin' && selected.type === 'faq' && (
                          <button
                            type="button"
                            onClick={handleDeleteFaq}
                            className="mt-2 ml-0 block px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 text-sm font-medium"
                          >
                            Delete FAQ
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
                {detailTab === 'history' && (
                  <div className="space-y-2">
                    {selected.versionHistory?.map((entry, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm"
                      >
                        <p className="text-gray-900 dark:text-white font-medium">{entry.change}</p>
                        <p className="text-gray-500 dark:text-gray-400">
                          {entry.author} · {formatDate(entry.date)}
                        </p>
                      </div>
                    ))}
                    {(!selected.versionHistory || selected.versionHistory.length === 0) && (
                      <p className="text-gray-500 dark:text-gray-400">No version history.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center text-gray-500 dark:text-gray-400">
              Select an item to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

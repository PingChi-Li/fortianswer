import { useState } from 'react'
import { RequestType } from '../types'
import { useChat } from '../hooks/useChat'
import { useAuth } from '../contexts/AuthContext'
import RequestTypePicker from '../components/chat/RequestTypePicker'
import ChatWidget from '../components/chat/ChatWidget'
import SourceDetailDrawer from '../components/chat/SourceDetailDrawer'
import WebSearchConsentModal from '../components/chat/WebSearchConsentModal'
import { REQUEST_TYPES } from '../utils/constants'
import type { Citation } from '../types'

const MOCK_SESSIONS = [
  { id: 's1', title: 'Phishing email question', date: 'Today' },
  { id: 's2', title: 'VPN connection help', date: 'Yesterday' }
]

const CHAT_TITLE_BY_ROLE: Record<string, string> = {
  Customer: 'Security Chat Assistant',
  Agent: 'Internal Helpdesk Chat',
  Admin: 'Security Console'
}

export default function Chat() {
  const { role } = useAuth()
  const chatTitle = CHAT_TITLE_BY_ROLE[role ?? 'Customer'] ?? 'Security Chat Assistant'
  const [selectedRequestType, setSelectedRequestType] = useState<RequestType | null>(null)
  const [forceShowChat, setForceShowChat] = useState(false)
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null)
  const [escalateOpen, setEscalateOpen] = useState(false)
  const [escalateForm, setEscalateForm] = useState({
    title: '',
    requestType: '' as RequestType | '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    description: ''
  })
  const {
    messages,
    isLoading,
    pendingWebSearchConsent,
    isPublic,
    sendMessage,
    confirmWebSearch,
    triggerOptionalWebSearch,
    submitFeedback,
    clearChat,
    setCurrentRequestType
  } = useChat()

  const handleRequestTypeSelect = (requestType: RequestType) => {
    setSelectedRequestType(requestType)
    setCurrentRequestType(requestType)
    clearChat()
  }

  const handleSendMessage = (message: string) => {
    sendMessage(message, selectedRequestType ?? undefined)
  }

  const openEscalate = () => {
    const summary = messages
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 200)}${m.content.length > 200 ? '...' : ''}`)
      .join('\n\n')
    setEscalateForm((prev) => ({
      ...prev,
      description: prev.description || `Chat context:\n\n${summary}`
    }))
    setEscalateOpen(true)
  }

  const handleEscalateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Escalate ticket:', escalateForm)
    setEscalateOpen(false)
    setEscalateForm({ title: '', requestType: '', priority: 'medium', description: '' })
    alert('Ticket created. A human agent will follow up.')
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex flex-1 min-h-0">
        {/* Left: History */}
        <aside className="w-56 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">History</h3>
          </div>
          <ul className="flex-1 overflow-y-auto p-2">
            {MOCK_SESSIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 truncate"
                >
                  {s.title}
                </button>
                <span className="text-xs text-gray-500 block px-3">{s.date}</span>
              </li>
            ))}
          </ul>
        </aside>

        {/* Center: Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedRequestType && !forceShowChat ? (
            <div className="container mx-auto px-4 py-8 max-w-3xl">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {chatTitle}
              </h1>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Select a request type to get started:
                </h2>
                <RequestTypePicker
                  onSelect={handleRequestTypeSelect}
                  selectedType={selectedRequestType}
                />
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    onClick={() => setForceShowChat(true)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Or start without a specific type
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedRequestType
                      ? selectedRequestType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                      : 'General Chat'}
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedRequestType(null)
                      setForceShowChat(false)
                      clearChat()
                    }}
                    className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Change Type
                  </button>
                  <button
                    onClick={clearChat}
                    className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
                  >
                    Clear Chat
                  </button>
                </div>
                <button
                  type="button"
                  onClick={openEscalate}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
                >
                  Escalate to Human
                </button>
              </div>
              <div className="flex-1 min-h-0 p-4">
                <div className="h-full max-w-4xl mx-auto">
                  <ChatWidget
                    messages={messages}
                    isLoading={isLoading}
                    requestType={selectedRequestType}
                    onSendMessage={handleSendMessage}
                    onFeedback={submitFeedback}
                    onCitationClick={setSelectedCitation}
                    isPublic={isPublic}
                    onOptionalWebSearch={triggerOptionalWebSearch}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Source drawer (overlay when citation selected) */}
        {selectedCitation && (
          <SourceDetailDrawer
            citation={selectedCitation}
            onClose={() => setSelectedCitation(null)}
          />
        )}
      </div>

      {/* Web Search Consent modal (Public dataBoundary only) */}
      {isPublic && (
        <WebSearchConsentModal
          open={!!pendingWebSearchConsent}
          onYes={() => confirmWebSearch('yes')}
          onNo={() => confirmWebSearch('no')}
        />
      )}

      {/* Escalate modal */}
      {escalateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Escalate to Human
              </h3>
              <form onSubmit={handleEscalateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    value={escalateForm.title}
                    onChange={(e) => setEscalateForm({ ...escalateForm, title: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="Brief description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Request Type</label>
                  <select
                    value={escalateForm.requestType}
                    onChange={(e) => setEscalateForm({ ...escalateForm, requestType: e.target.value as RequestType })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select</option>
                    {REQUEST_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select
                    value={escalateForm.priority}
                    onChange={(e) => setEscalateForm({ ...escalateForm, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (chat history attached)</label>
                  <textarea
                    value={escalateForm.description}
                    onChange={(e) => setEscalateForm({ ...escalateForm, description: e.target.value })}
                    required
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Create Ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => setEscalateOpen(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

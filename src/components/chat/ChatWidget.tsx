import { useState, useRef, useEffect } from 'react'
import { ChatMessage, MessageFeedback, RequestType, Citation } from '../../types'
import MessageBubble from './MessageBubble'
import SuggestedPrompts from './SuggestedPrompts'
import LoadingSpinner from '../common/LoadingSpinner'

interface ChatWidgetProps {
  messages: ChatMessage[]
  isLoading: boolean
  requestType: RequestType | null
  onSendMessage: (message: string) => void
  onFeedback: (feedback: MessageFeedback) => void
  onCitationClick?: (citation: Citation) => void
  isPublic?: boolean
  onOptionalWebSearch?: (messageId: string, userMessage: string, webSearchToken?: string) => void
}

const SUGGESTED_PROMPTS: Partial<Record<RequestType, string[]>> = {
  phishing: [
    'How do I identify a phishing email?',
    'What should I do if I clicked a suspicious link?',
    'How to report a phishing attempt?'
  ],
  suspicious_login: [
    'I see a login from an unknown location',
    'How do I check my login history?',
    'What should I do if my account was compromised?'
  ],
  vpn: [
    'How do I connect to the VPN?',
    'VPN connection keeps dropping',
    'I forgot my VPN password'
  ],
  mfa: [
    'How do I set up MFA?',
    'I lost access to my MFA device',
    'MFA code not working'
  ],
  endpoint_alert: [
    'What does this endpoint alert mean?',
    'How do I resolve an endpoint security alert?',
    'Is this endpoint alert critical?'
  ],
  password_reset: [
    'How do I reset my password?',
    'I forgot my password',
    'Password reset not working'
  ],
  account_lockout: [
    'My account is locked',
    'How do I unlock my account?',
    'Account lockout after failed attempts'
  ],
  severity: [
    'We have a confirmed breach',
    'Active incident detected',
    'What is the escalation path?'
  ],
  general: [
    'I need help with a security issue',
    'General question about security'
  ]
}

export default function ChatWidget({
  messages,
  isLoading,
  requestType,
  onSendMessage,
  onFeedback,
  onCitationClick,
  isPublic,
  onOptionalWebSearch
}: ChatWidgetProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt)
  }

  const suggestedPrompts = requestType ? (SUGGESTED_PROMPTS[requestType] ?? []) : []

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>Start a conversation by typing a message below.</p>
            {suggestedPrompts.length > 0 && (
              <SuggestedPrompts prompts={suggestedPrompts} onSelect={handleSuggestedPrompt} />
            )}
          </div>
        )}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onFeedback={onFeedback}
            onCitationClick={onCitationClick}
            isPublic={isPublic}
            onOptionalWebSearch={onOptionalWebSearch}
          />
        ))}
        {isLoading && messages.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3">
              <LoadingSpinner size="sm" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}

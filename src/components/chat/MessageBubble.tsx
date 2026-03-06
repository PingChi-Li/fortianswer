import { useState, useCallback, useEffect } from 'react'
import { ChatMessage, MessageFeedback, Citation } from '../../types'
import LoadingSpinner from '../common/LoadingSpinner'
import FeedbackUI from './FeedbackUI'
import CitationsPanel from './CitationsPanel'
import { SHOW_DEBUG_UI } from '../../utils/constants'
import { fetchDebugInfo } from '../../services/debugService'

interface MessageBubbleProps {
  message: ChatMessage
  onFeedback?: (feedback: MessageFeedback) => void
  onCitationClick?: (citation: Citation) => void
  isPublic?: boolean
  onOptionalWebSearch?: (messageId: string, userMessage: string, webSearchToken?: string) => void
}

function renderContentWithCitations(
  content: string,
  citations: Citation[] | undefined,
  onCitationClick: ((citation: Citation) => void) | undefined
) {
  if (!citations?.length || !onCitationClick) {
    return <p className="whitespace-pre-wrap">{content}</p>
  }
  const parts = content.split(/(\[\d+\])/g)
  return (
    <p className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/)
        if (match) {
          const num = parseInt(match[1], 10)
          const citation = citations[num - 1]
          if (citation) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => onCitationClick(citation)}
                className="mx-0.5 align-super text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {part}
              </button>
            )
          }
        }
        return <span key={i}>{part}</span>
      })}
    </p>
  )
}

function DebugButton({ requestId }: { requestId: string }) {
  const [showModal, setShowModal] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 font-medium"
      >
        Debug
      </button>
      {showModal && <DebugModal requestId={requestId} onClose={() => setShowModal(false)} />}
    </>
  )
}

function DebugModal({
  requestId,
  onClose
}: {
  requestId: string
  onClose: () => void
}) {
  const [debugJson, setDebugJson] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchDebugInfo(requestId)
      .then((res) => setDebugJson(res.debugJson))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to fetch debug info'))
      .finally(() => setLoading(false))
  }, [requestId])

  const handleCopy = useCallback(async () => {
    if (!debugJson) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(debugJson, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [debugJson])

  const handleDownload = useCallback(() => {
    if (!debugJson) return
    const blob = new Blob([JSON.stringify(debugJson, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-${requestId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [debugJson, requestId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Debug Info</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-gray-500">Loading debug info...</span>
            </div>
          )}
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}
          {debugJson != null && !loading ? (
            <pre className="text-xs overflow-auto p-3 bg-gray-50 dark:bg-gray-900 rounded-lg max-h-96">
              {JSON.stringify(debugJson, null, 2)}
            </pre>
          ) : null}
        </div>
        {debugJson != null && !loading ? (
          <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Download JSON
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function MessageBubble({ message, onFeedback, onCitationClick, isPublic, onOptionalWebSearch }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isRetrieving = message.status === 'retrieving'
  const isGenerating = message.status === 'generating'
  const isError = message.status === 'error'
  const isEscalated = message.status === 'escalated'
  const isComplete = message.status === 'complete' || (!message.status && !isEscalated)
  const showDebugButton = SHOW_DEBUG_UI && message.requestId && !isUser

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-3xl rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : isEscalated ? (
          <div className="space-y-3">
            <div className="font-semibold text-amber-700 dark:text-amber-400">
              The escalated case
            </div>
            {message.escalation?.reason && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {message.escalation.reason}
              </p>
            )}
            {showDebugButton && (
              <div className="mt-2">
                <DebugButton requestId={message.requestId!} />
              </div>
            )}
          </div>
        ) : (
          <div>
            {message.actionHints && message.actionHints.length > 0 && (
              <div className="mb-3 p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-sm">
                {message.actionHints.map((hint, i) => (
                  <p key={i} className="mb-1 last:mb-0">
                    {hint}
                  </p>
                ))}
              </div>
            )}
            {isRetrieving && (
              <div className="flex items-center gap-2 mb-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Searching Azure Knowledge Base...
                </span>
              </div>
            )}
            {isGenerating && (
              <div className="flex items-center gap-2 mb-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Generating response...
                </span>
              </div>
            )}
            {isError && (
              <div className="mb-2">
                <span className="text-red-600 dark:text-red-400 text-sm">
                  Error occurred
                </span>
              </div>
            )}
            {message.content && (
              <div className="mb-3">
                {renderContentWithCitations(
                  message.content,
                  message.citations,
                  onCitationClick
                )}
              </div>
            )}
            {message.citations && message.citations.length > 0 && (
              <CitationsPanel citations={message.citations} />
            )}
            {isPublic && isComplete && message.optionalWebSearch?.webSearchToken && onOptionalWebSearch && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() =>
                    onOptionalWebSearch(
                      message.id,
                      message.optionalWebSearch!.userMessage,
                      message.optionalWebSearch!.webSearchToken
                    )
                  }
                  className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 font-medium"
                >
                  Optional Web Search
                </button>
              </div>
            )}
            {isComplete && message.content && onFeedback && (
              <FeedbackUI
                messageId={message.id}
                onSubmit={onFeedback}
              />
            )}
            {showDebugButton && (
              <div className="mt-2">
                <DebugButton requestId={message.requestId!} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

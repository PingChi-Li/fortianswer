import { useState, useCallback } from 'react'
import { ChatMessage, MessageFeedback, Citation } from '../../types'
import LoadingSpinner from '../common/LoadingSpinner'
import FeedbackUI from './FeedbackUI'
import CitationsPanel from './CitationsPanel'

interface MessageBubbleProps {
  message: ChatMessage
  onFeedback?: (feedback: MessageFeedback) => void
  onCitationClick?: (citation: Citation) => void
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

function CopyRequestIdButton({ requestId }: { requestId: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(requestId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [requestId])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy RequestId'}
    </button>
  )
}

export default function MessageBubble({ message, onFeedback, onCitationClick }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isRetrieving = message.status === 'retrieving'
  const isGenerating = message.status === 'generating'
  const isError = message.status === 'error'
  const isEscalated = message.status === 'escalated'
  const isComplete = message.status === 'complete' || (!message.status && !isEscalated)

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
            {message.requestId && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Request ID: {message.requestId}
                </span>
                <CopyRequestIdButton requestId={message.requestId} />
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
            {isComplete && message.content && onFeedback && (
              <FeedbackUI
                messageId={message.id}
                onSubmit={onFeedback}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

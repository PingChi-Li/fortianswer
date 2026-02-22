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

export default function MessageBubble({ message, onFeedback, onCitationClick }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isRetrieving = message.status === 'retrieving'
  const isGenerating = message.status === 'generating'
  const isError = message.status === 'error'
  const isComplete = message.status === 'complete' || !message.status

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
        ) : (
          <div>
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

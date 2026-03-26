import { useState } from 'react'
import { MessageFeedback, FeedbackReasonCategory } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { submitChatFeedback } from '../../services/feedbackService'
import { ApiClientError } from '../../services/apiClient'

interface FeedbackUIProps {
  messageId: string
  requestId?: string
  issueType?: string
  citationUrls?: string[]
  onSubmit: (feedback: MessageFeedback) => void
}

const REASON_OPTIONS: { value: FeedbackReasonCategory; label: string }[] = [
  { value: 'hallucination', label: 'Hallucination' },
  { value: 'outdated', label: 'Outdated' },
  { value: 'harmful', label: 'Harmful' }
]

export default function FeedbackUI({
  messageId,
  requestId,
  issueType,
  citationUrls,
  onSubmit
}: FeedbackUIProps) {
  const { user } = useAuth()
  const [helpful, setHelpful] = useState<boolean | null>(null)
  const [solved, setSolved] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showReason, setShowReason] = useState(false)
  const [reasonCategory, setReasonCategory] = useState<FeedbackReasonCategory | ''>('')
  const [reasonText, setReasonText] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleThumbsDown = () => {
    setHelpful(false)
    setShowReason(true)
  }

  const handleSubmit = async () => {
    if (helpful === null) return
    setSubmitError('')
    const feedback: MessageFeedback = {
      messageId,
      helpful,
      solved,
      ...(helpful === false && (reasonCategory || reasonText)
        ? {
            reasonCategory: reasonCategory || undefined,
            reasonForFailure: reasonText || undefined
          }
        : {})
    }

    const username = user?.username
    if (requestId && username) {
      setSubmitting(true)
      try {
        await submitChatFeedback({
          requestId,
          username,
          rating: helpful ? 'up' : 'down',
          issueType,
          citations: citationUrls?.length ? citationUrls : undefined
        })
      } catch (err) {
        const msg =
          err instanceof ApiClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to send feedback'
        setSubmitError(msg)
        setSubmitting(false)
        return
      }
      setSubmitting(false)
    }

    onSubmit(feedback)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
        <p className="text-sm text-green-600 dark:text-green-400">
          Thank you for your feedback!
        </p>
      </div>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600 space-y-3">
      {submitError && (
        <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
      )}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Helpful?</span>
          <button
            onClick={() => setHelpful(true)}
            className={`p-1 rounded ${
              helpful === true
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
            aria-label="Thumbs up"
          >
            👍
          </button>
          <button
            onClick={handleThumbsDown}
            className={`p-1 rounded ${
              helpful === false
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
            aria-label="Thumbs down"
          >
            👎
          </button>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={solved}
            onChange={(e) => setSolved(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">Solved?</span>
        </label>
        {helpful !== null && (
          <button
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Submit'}
          </button>
        )}
      </div>
      {showReason && helpful === false && (
        <div className="text-sm space-y-2 pl-1">
          <span className="text-gray-600 dark:text-gray-400">Reason for failure:</span>
          <div className="flex flex-wrap gap-2">
            {REASON_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name={`reason-${messageId}`}
                  checked={reasonCategory === opt.value}
                  onChange={() => setReasonCategory(opt.value)}
                  className="rounded"
                />
                <span className="text-gray-700 dark:text-gray-300">{opt.label}</span>
              </label>
            ))}
          </div>
          <input
            type="text"
            placeholder="Additional details (optional)"
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            className="w-full max-w-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>
      )}
    </div>
  )
}

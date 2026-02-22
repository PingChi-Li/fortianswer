import { useState, useCallback, useRef } from 'react'
import { ChatMessage, RequestType, MessageFeedback, Citation, ApiCitation } from '../types'
import { sendChatRequest, type ChatServiceError } from '../services/chatService'
import { useSession } from './useSession'
import { useUser } from '../contexts/UserContext'

function apiCitationsToCitations(apiCitations: ApiCitation[]): Citation[] {
  return apiCitations.map((c, i) => {
    const isUrl = (() => {
      try {
        return c.urlOrId.startsWith('http://') || c.urlOrId.startsWith('https://')
      } catch {
        return false
      }
    })()
    return {
      id: `cite_${i}`,
      sourceName: c.title ?? (isUrl ? c.urlOrId : 'Internal document'),
      urlOrId: c.urlOrId,
      link: isUrl ? c.urlOrId : undefined,
      snippet: c.snippet
    }
  })
}

export interface PendingWebSearchConsent {
  message: string
  webSearchToken: string
  messageId: string
}

export function useChat() {
  const { sessionId } = useSession()
  const { user } = useUser()
  const correlationIdRef = useRef(`corr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentRequestType, setCurrentRequestType] = useState<RequestType | null>(null)
  const [pendingWebSearchConsent, setPendingWebSearchConsent] = useState<PendingWebSearchConsent | null>(null)

  const userRole = user.isAdmin ? 'Admin' : 'User'

  const performInitialRequest = useCallback(
    async (message: string): Promise<{ response: Awaited<ReturnType<typeof sendChatRequest>>; isRetry?: boolean }> => {
      return sendChatRequest(
        {
          message,
          conversationId: sessionId ?? undefined,
          userRole,
          userGroup: undefined
        },
        correlationIdRef.current
      ).then((response) => ({ response }))
    },
    [sessionId, userRole]
  )

  const performConsentRequest = useCallback(
    async (message: string, webSearchToken: string): Promise<Awaited<ReturnType<typeof sendChatRequest>>> => {
      return sendChatRequest(
        {
          message,
          conversationId: sessionId ?? undefined,
          userRole,
          userGroup: undefined,
          confirmWebSearch: true,
          webSearchToken
        },
        correlationIdRef.current
      )
    },
    [sessionId, userRole]
  )

  const sendMessage = useCallback(
    async (content: string, requestType?: RequestType) => {
      if (!content.trim()) return

      if (requestType && !currentRequestType) {
        setCurrentRequestType(requestType)
      }

      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
        requestType: requestType ?? undefined
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setPendingWebSearchConsent(null)

      const assistantMessageId = `msg_${Date.now()}_assistant`
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        status: 'retrieving',
        timestamp: new Date(),
        requestType: requestType ?? undefined
      }

      setMessages((prev) => [...prev, assistantMessage])

      const applySuccess = (
        msgId: string,
        answer: string,
        citations: ApiCitation[] | undefined,
        status: 'complete' | 'retrieving' = 'complete'
      ) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === msgId
              ? {
                  ...msg,
                  content: answer,
                  status,
                  citations: citations ? apiCitationsToCitations(citations) : undefined
                }
              : msg
          )
        )
      }

      const applyError = (msgId: string) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === msgId
              ? {
                  ...msg,
                  content: 'Sorry, I encountered an error. Please try again.',
                  status: 'error' as const
                }
              : msg
          )
        )
      }

      try {
        const { response } = await performInitialRequest(content.trim())

        if (response.requestId) {
          console.debug('[chat] requestId:', response.requestId)
        }

        if (response.needsWebConfirmation && response.webSearchToken) {
          applySuccess(assistantMessageId, response.answer, response.citations, 'retrieving')
          setPendingWebSearchConsent({
            message: content.trim(),
            webSearchToken: response.webSearchToken,
            messageId: assistantMessageId
          })
        } else {
          applySuccess(assistantMessageId, response.answer, response.citations)
        }
      } catch {
        applyError(assistantMessageId)
      } finally {
        setIsLoading(false)
      }
    },
    [currentRequestType, performInitialRequest]
  )

  const confirmWebSearch = useCallback(
    async (choice: 'yes' | 'no') => {
      if (!pendingWebSearchConsent) return

      if (choice === 'no') {
        setPendingWebSearchConsent(null)
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === pendingWebSearchConsent.messageId ? { ...msg, status: 'complete' as const } : msg
          )
        )
        return
      }

      const { message, webSearchToken, messageId } = pendingWebSearchConsent
      setPendingWebSearchConsent(null)
      setIsLoading(true)

      const applySuccess = (answer: string, citations: ApiCitation[] | undefined) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  content: answer,
                  status: 'complete' as const,
                  citations: citations ? apiCitationsToCitations(citations) : msg.citations
                }
              : msg
          )
        )
      }

      const applyError = () => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  content: msg.content + '\n\nSorry, I encountered an error while performing web search. Please try again.',
                  status: 'error' as const
                }
              : msg
          )
        )
      }

      try {
        let response = await performConsentRequest(message, webSearchToken)

        if (response.requestId) {
          console.debug('[chat] requestId (consent):', response.requestId)
        }

        if (response.needsWebConfirmation && response.webSearchToken) {
          setPendingWebSearchConsent({
            message,
            webSearchToken: response.webSearchToken,
            messageId
          })
        } else {
          applySuccess(response.answer, response.citations)
        }
      } catch (error) {
        const err = error as ChatServiceError

        if (err.isTokenExpiration) {
          try {
            const { response } = await performInitialRequest(message)
            if (response.requestId) {
              console.debug('[chat] requestId (retry):', response.requestId)
            }
            if (response.needsWebConfirmation && response.webSearchToken) {
              setPendingWebSearchConsent({
                message,
                webSearchToken: response.webSearchToken,
                messageId
              })
            } else {
              applySuccess(response.answer, response.citations)
            }
          } catch (retryErr) {
            const retry = retryErr as ChatServiceError
            if (retry.requestId) console.debug('[chat] retry requestId:', retry.requestId)
            applyError()
          }
        } else {
          applyError()
        }
      } finally {
        setIsLoading(false)
      }
    },
    [pendingWebSearchConsent, performConsentRequest, performInitialRequest]
  )

  const submitFeedback = useCallback((feedback: MessageFeedback) => {
    console.log('Feedback submitted:', feedback)
    setMessages((prev) =>
      prev.map((msg) => (msg.id === feedback.messageId ? { ...msg } : msg))
    )
  }, [])

  const clearChat = useCallback(() => {
    setMessages([])
    setCurrentRequestType(null)
    setPendingWebSearchConsent(null)
  }, [])

  return {
    messages,
    isLoading,
    currentRequestType,
    pendingWebSearchConsent,
    sendMessage,
    confirmWebSearch,
    submitFeedback,
    clearChat,
    setCurrentRequestType
  }
}

import { useState, useCallback, useRef } from 'react'
import { ChatMessage, RequestType, MessageFeedback, Citation, ApiCitation, ROLE_TO_DATA_BOUNDARY } from '../types'
import { sendChatRequest, type ChatServiceError } from '../services/chatService'
import { useSession } from './useSession'
import { useAuth } from '../contexts/AuthContext'

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
  const { role } = useAuth()
  const correlationIdRef = useRef(`corr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentRequestType, setCurrentRequestType] = useState<RequestType | null>(null)
  const [pendingWebSearchConsent, setPendingWebSearchConsent] = useState<PendingWebSearchConsent | null>(null)

  const appRole = role ?? 'Customer'
  const dataBoundary = ROLE_TO_DATA_BOUNDARY[appRole]
  const isPublic = dataBoundary === 'Public'

  const performInitialRequest = useCallback(
    async (message: string, confirmWebSearch = false, webSearchToken?: string | null): Promise<{ response: Awaited<ReturnType<typeof sendChatRequest>>; isRetry?: boolean }> => {
      return sendChatRequest(
        {
          message,
          issueType: 'General',
          dataBoundary,
          conversationId: sessionId ?? undefined,
          confirmWebSearch,
          webSearchToken: webSearchToken ?? null
        },
        { correlationId: correlationIdRef.current, role: appRole }
      ).then((response) => ({ response }))
    },
    [sessionId, dataBoundary, appRole]
  )

  const performConsentRequest = useCallback(
    async (message: string, webSearchToken: string): Promise<Awaited<ReturnType<typeof sendChatRequest>>> => {
      return sendChatRequest(
        {
          message,
          issueType: 'General',
          dataBoundary,
          conversationId: sessionId ?? undefined,
          confirmWebSearch: true,
          webSearchToken
        },
        { correlationId: correlationIdRef.current, role: appRole }
      )
    },
    [sessionId, dataBoundary, appRole]
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
        status: 'complete' | 'retrieving' = 'complete',
        escalation?: { shouldEscalate: boolean; reason?: string },
        requestId?: string,
        actionHints?: string[]
      ) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === msgId
              ? {
                  ...msg,
                  content: answer,
                  status: escalation?.shouldEscalate ? ('escalated' as const) : status,
                  citations: escalation?.shouldEscalate ? undefined : (citations ? apiCitationsToCitations(citations) : undefined),
                  escalation: escalation?.shouldEscalate ? escalation : undefined,
                  requestId: escalation?.shouldEscalate ? requestId : undefined,
                  actionHints: actionHints?.length ? actionHints : undefined
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

        if (response.escalation?.shouldEscalate) {
          applySuccess(
            assistantMessageId,
            response.answer,
            undefined,
            'complete',
            response.escalation,
            response.requestId,
            response.actionHints
          )
        } else if (isPublic && response.needsWebConfirmation && response.webSearchToken) {
          applySuccess(assistantMessageId, response.answer, response.citations, 'retrieving')
          setPendingWebSearchConsent({
            message: content.trim(),
            webSearchToken: response.webSearchToken,
            messageId: assistantMessageId
          })
        } else {
          applySuccess(
            assistantMessageId,
            response.answer,
            response.citations,
            'complete',
            undefined,
            undefined,
            response.actionHints
          )
        }
      } catch {
        applyError(assistantMessageId)
      } finally {
        setIsLoading(false)
      }
    },
    [currentRequestType, performInitialRequest, isPublic]
  )

  const confirmWebSearch = useCallback(
    async (choice: 'yes' | 'no') => {
      if (!pendingWebSearchConsent) return

      if (choice === 'no') {
        setPendingWebSearchConsent(null)
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === pendingWebSearchConsent.messageId
              ? { ...msg, content: 'Cancel connection for further information search', status: 'complete' as const }
              : msg
          )
        )
        return
      }

      const { message, webSearchToken, messageId } = pendingWebSearchConsent
      setPendingWebSearchConsent(null)
      setIsLoading(true)

      const applySuccess = (
        answer: string,
        citations: ApiCitation[] | undefined,
        escalation?: { shouldEscalate: boolean; reason?: string },
        requestId?: string,
        actionHints?: string[]
      ) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  content: answer,
                  status: escalation?.shouldEscalate ? ('escalated' as const) : ('complete' as const),
                  citations: escalation?.shouldEscalate ? undefined : (citations ? apiCitationsToCitations(citations) : msg.citations),
                  escalation: escalation?.shouldEscalate ? escalation : undefined,
                  requestId: escalation?.shouldEscalate ? requestId : undefined,
                  actionHints: actionHints?.length ? actionHints : msg.actionHints
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

        if (response.escalation?.shouldEscalate) {
          applySuccess(
            response.answer,
            undefined,
            response.escalation,
            response.requestId,
            response.actionHints
          )
        } else if (response.needsWebConfirmation && response.webSearchToken) {
          setPendingWebSearchConsent({
            message,
            webSearchToken: response.webSearchToken,
            messageId
          })
        } else {
          applySuccess(response.answer, response.citations, undefined, undefined, response.actionHints)
        }
      } catch (error) {
        const err = error as ChatServiceError

        if (err.isTokenExpiration) {
          try {
            const { response } = await performInitialRequest(message)
            if (response.requestId) {
              console.debug('[chat] requestId (retry):', response.requestId)
            }
            if (response.escalation?.shouldEscalate) {
              applySuccess(
                response.answer,
                undefined,
                response.escalation,
                response.requestId,
                response.actionHints
              )
            } else if (response.needsWebConfirmation && response.webSearchToken) {
              setPendingWebSearchConsent({
                message,
                webSearchToken: response.webSearchToken,
                messageId
              })
            } else {
              applySuccess(response.answer, response.citations, undefined, undefined, response.actionHints)
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
    dataBoundary,
    isPublic,
    sendMessage,
    confirmWebSearch,
    submitFeedback,
    clearChat,
    setCurrentRequestType
  }
}

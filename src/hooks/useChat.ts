import { useState, useCallback, useRef } from 'react'
import { ChatMessage, RequestType, MessageFeedback, Citation, ApiCitation, ROLE_TO_DATA_BOUNDARY } from '../types'
import { sendChatRequest, type ChatServiceError } from '../services/chatService'
import { useSession } from './useSession'
import { useAuth } from '../contexts/AuthContext'

/** Strip Azure debug metadata block from answer (cfg:, serverRequestId=, internal:, retrieval:, used:, next:, etc.) */
function stripDebugBlock(answer: string): string {
  const lines = answer.split('\n')
  const debugPattern = /^(cfg:|serverRequestId=|role=|boundary=|issueType=|clientCorrelationId=|retrieval:|internal:|used:|next:)/
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line || debugPattern.test(line)) {
      i++
      continue
    }
    break
  }
  const trimmed = lines.slice(i).join('\n').trim()
  return trimmed || answer
}

function getDocumentTitle(c: ApiCitation & Record<string, unknown>): string | undefined {
  const t = c.title ?? c.documentTitle ?? c.sourceTitle ?? c.name
  return typeof t === 'string' && t.trim() ? t.trim() : undefined
}

function parseScore(snippet: string | undefined): number | undefined {
  if (!snippet) return undefined
  const m = snippet.match(/score\s*=\s*([\d.]+)/i)
  return m ? parseFloat(m[1]) : undefined
}

function apiCitationsToCitations(apiCitations: ApiCitation[]): Citation[] {
  return apiCitations.map((c, i) => {
    const apiC = c as ApiCitation & Record<string, unknown>
    const isUrl = (() => {
      try {
        return c.urlOrId.startsWith('http://') || c.urlOrId.startsWith('https://')
      } catch {
        return false
      }
    })()
    const title = getDocumentTitle(apiC)
    const score = (c as ApiCitation & { score?: number }).score ?? parseScore(c.snippet)
    const snippetForContent = c.snippet && !/^score\s*=\s*[\d.]+$/i.test(c.snippet.trim()) ? c.snippet : undefined
    return {
      id: `cite_${i}`,
      sourceName: title ?? (isUrl ? c.urlOrId : 'Internal document'),
      urlOrId: c.urlOrId,
      link: isUrl ? c.urlOrId : undefined,
      snippet: snippetForContent,
      score
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
        actionHints?: string[],
        optionalWebSearch?: { userMessage: string; webSearchToken?: string }
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
                  actionHints: actionHints?.length ? actionHints : undefined,
                  optionalWebSearch
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
            stripDebugBlock(response.answer),
            undefined,
            'complete',
            response.escalation,
            response.requestId,
            response.actionHints
          )
        } else if (isPublic && response.needsWebConfirmation && response.webSearchToken) {
          applySuccess(assistantMessageId, stripDebugBlock(response.answer), response.citations, 'retrieving')
          setPendingWebSearchConsent({
            message: content.trim(),
            webSearchToken: response.webSearchToken,
            messageId: assistantMessageId
          })
        } else {
          const optionalWebSearch =
            isPublic && !response.needsWebConfirmation && response.optionalWebSearchToken
              ? { userMessage: content.trim(), webSearchToken: response.optionalWebSearchToken }
              : undefined
          applySuccess(
            assistantMessageId,
            stripDebugBlock(response.answer),
            response.citations,
            'complete',
            undefined,
            undefined,
            response.actionHints,
            optionalWebSearch
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
            stripDebugBlock(response.answer),
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
          applySuccess(stripDebugBlock(response.answer), response.citations, undefined, undefined, response.actionHints)
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
                stripDebugBlock(response.answer),
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
              applySuccess(stripDebugBlock(response.answer), response.citations, undefined, undefined, response.actionHints)
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

  const triggerOptionalWebSearch = useCallback(
    async (messageId: string, userMessage: string, webSearchToken?: string) => {
      if (webSearchToken) {
        setPendingWebSearchConsent({
          message: userMessage,
          webSearchToken,
          messageId
        })
      } else {
        setIsLoading(true)
        setPendingWebSearchConsent(null)
        try {
          const { response } = await performInitialRequest(userMessage)
          if (response.requestId) {
            console.debug('[chat] requestId (optional web search):', response.requestId)
          }
          if (response.escalation?.shouldEscalate) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      content: stripDebugBlock(response.answer),
                      status: 'escalated' as const,
                      escalation: response.escalation,
                      requestId: response.requestId,
                      actionHints: response.actionHints,
                      optionalWebSearch: undefined
                    }
                  : msg
              )
            )
          } else if (response.needsWebConfirmation && response.webSearchToken) {
            setPendingWebSearchConsent({
              message: userMessage,
              webSearchToken: response.webSearchToken,
              messageId
            })
          } else {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      content: stripDebugBlock(response.answer),
                      citations: response.citations ? apiCitationsToCitations(response.citations) : msg.citations,
                      actionHints: response.actionHints?.length ? response.actionHints : msg.actionHints,
                      optionalWebSearch: undefined
                    }
                  : msg
              )
            )
          }
        } catch {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    content: msg.content + '\n\nSorry, I encountered an error. Please try again.',
                    status: 'error' as const,
                    optionalWebSearch: undefined
                  }
                : msg
            )
          )
        } finally {
          setIsLoading(false)
        }
      }
    },
    [performInitialRequest]
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
    triggerOptionalWebSearch,
    submitFeedback,
    clearChat,
    setCurrentRequestType
  }
}

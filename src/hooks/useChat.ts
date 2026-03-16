import { useState, useCallback, useRef } from 'react'
import { ChatMessage, RequestType, MessageFeedback, Citation, ApiCitation, ROLE_TO_DATA_BOUNDARY, REQUEST_TYPE_TO_ISSUE_TYPE, type IssueType, type SlotFillingState } from '../types'
import { sendChatRequest, type ChatServiceError } from '../services/chatService'
import { useSession } from './useSession'
import { useAuth } from '../contexts/AuthContext'
import { saveConversation } from '../utils/conversationCache'

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
  requestType?: RequestType
}

function toAssistantContent(answer: string, slotFilling?: SlotFillingState): string {
  const cleanAnswer = stripDebugBlock(answer)
  const nextQuestion = slotFilling?.nextQuestion?.trim()
  if (!nextQuestion) return cleanAnswer
  if (!cleanAnswer) return nextQuestion
  return `${cleanAnswer}\n\n${nextQuestion}`
}

export function useChat() {
  const { sessionId, clearSession, setConversationId } = useSession()
  const { user, role } = useAuth()
  const correlationIdRef = useRef(`corr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentRequestType, setCurrentRequestType] = useState<RequestType | null>(null)
  const [pendingWebSearchConsent, setPendingWebSearchConsent] = useState<PendingWebSearchConsent | null>(null)
  const [slotFillingState, setSlotFillingState] = useState<SlotFillingState | null>(null)

  const appRole = role ?? 'Customer'
  const dataBoundary = ROLE_TO_DATA_BOUNDARY[appRole]
  const isPublic = dataBoundary === 'Public'
  const username = user?.username

  const getIssueType = useCallback((rt: RequestType | null | undefined) => {
    return rt ? REQUEST_TYPE_TO_ISSUE_TYPE[rt] : 'General'
  }, [])

  const performInitialRequest = useCallback(
    async (
      message: string,
      confirmWebSearch = false,
      webSearchToken?: string | null,
      issueType: IssueType = 'General'
    ): Promise<{ response: Awaited<ReturnType<typeof sendChatRequest>>; isRetry?: boolean }> => {
      return sendChatRequest(
        {
          message,
          issueType,
          userRole: appRole,
          username: username ?? undefined,
          dataBoundary,
          conversationId: sessionId ?? undefined,
          confirmWebSearch,
          webSearchToken: webSearchToken ?? null
        },
        { correlationId: correlationIdRef.current, role: appRole }
      ).then((response) => ({ response }))
    },
    [sessionId, dataBoundary, appRole, username]
  )

  const performConsentRequest = useCallback(
    async (message: string, webSearchToken: string, issueType: IssueType = 'General'): Promise<Awaited<ReturnType<typeof sendChatRequest>>> => {
      return sendChatRequest(
        {
          message,
          issueType,
          userRole: appRole,
          username: username ?? undefined,
          dataBoundary,
          conversationId: sessionId ?? undefined,
          confirmWebSearch: true,
          webSearchToken
        },
        { correlationId: correlationIdRef.current, role: appRole }
      )
    },
    [sessionId, dataBoundary, appRole, username]
  )

  const performFollowUpRequest = useCallback(
    async (message: string): Promise<Awaited<ReturnType<typeof sendChatRequest>>> => {
      return sendChatRequest(
        {
          message,
          username: username ?? undefined,
          conversationId: sessionId ?? undefined
        },
        { correlationId: correlationIdRef.current, role: appRole }
      )
    },
    [sessionId, appRole, username]
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
        ticketId?: string,
        actionHints?: string[],
        optionalWebSearch?: { userMessage: string; webSearchToken?: string },
        slotFilling?: SlotFillingState
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
                  requestId: requestId ?? undefined,
                  ticketId: ticketId ?? undefined,
                  actionHints: actionHints?.length ? actionHints : undefined,
                  optionalWebSearch,
                  slotFilling: slotFilling?.isActive ? slotFilling : undefined
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

      const activeRequestType = requestType ?? currentRequestType ?? undefined
      const issueType = getIssueType(activeRequestType)
      const isSlotFillingTurn = slotFillingState?.isActive === true

      try {
        const response = isSlotFillingTurn
          ? await performFollowUpRequest(content.trim())
          : (await performInitialRequest(content.trim(), false, null, issueType)).response

        if (response.conversationId) {
          setConversationId(response.conversationId)
        }

        if (response.requestId) {
          console.debug('[chat] requestId:', response.requestId)
        }

        const ticketId = response.next?.action === 'escalate' ? response.next.ticketId : undefined
        const isSlotFillingResponse = response.next?.action === 'slot_filling' || response.slotFilling?.isActive === true

        if (isSlotFillingResponse) {
          const slotFilling = response.slotFilling ?? { isActive: true }
          setSlotFillingState(slotFilling)
          applySuccess(
            assistantMessageId,
            toAssistantContent(response.answer, slotFilling),
            response.citations,
            'complete',
            undefined,
            response.requestId,
            undefined,
            response.actionHints,
            undefined,
            slotFilling
          )
          if (response.requestId) {
            saveConversation({
              requestId: response.requestId,
              conversationId: response.conversationId ?? sessionId,
              userMessage: content.trim(),
              assistantMessage: toAssistantContent(response.answer, slotFilling),
              citations: response.citations ? apiCitationsToCitations(response.citations) : undefined,
              outcome: 'slot_filling',
              issueType,
              requestType: activeRequestType,
              createdAtUtc: new Date().toISOString()
            })
          }
        } else if (response.escalation?.shouldEscalate) {
          setSlotFillingState(null)

          applySuccess(
            assistantMessageId,
            stripDebugBlock(response.answer),
            undefined,
            'complete',
            response.escalation,
            response.requestId,
            ticketId,
            response.actionHints
          )
          if (response.requestId) {
            saveConversation({
              requestId: response.requestId,
              conversationId: response.conversationId ?? sessionId,
              userMessage: content.trim(),
              assistantMessage: stripDebugBlock(response.answer),
              ticketId,
              escalation: response.escalation,
              outcome: 'escalated',
              issueType,
              requestType: activeRequestType,
              createdAtUtc: new Date().toISOString()
            })
          }
        } else if (isPublic && response.needsWebConfirmation && response.webSearchToken) {
          setSlotFillingState(null)
          applySuccess(assistantMessageId, stripDebugBlock(response.answer), response.citations, 'retrieving', undefined, response.requestId, undefined)
          if (response.requestId) {
            saveConversation({
              requestId: response.requestId,
              conversationId: response.conversationId ?? sessionId,
              userMessage: content.trim(),
              assistantMessage: stripDebugBlock(response.answer),
              outcome: 'needs_web_confirmation',
              issueType,
              requestType: activeRequestType,
              createdAtUtc: new Date().toISOString()
            })
          }
          setPendingWebSearchConsent({
            message: content.trim(),
            webSearchToken: response.webSearchToken,
            messageId: assistantMessageId,
            requestType: activeRequestType
          })
        } else {
          setSlotFillingState(null)
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
            response.requestId,
            ticketId,
            response.actionHints,
            optionalWebSearch
          )
          if (response.requestId) {
            saveConversation({
              requestId: response.requestId,
              conversationId: response.conversationId ?? sessionId,
              userMessage: content.trim(),
              assistantMessage: stripDebugBlock(response.answer),
              citations: response.citations ? apiCitationsToCitations(response.citations) : undefined,
              ticketId,
              outcome: 'answered',
              issueType,
              requestType: activeRequestType,
              createdAtUtc: new Date().toISOString()
            })
          }
        }
      } catch {
        applyError(assistantMessageId)
      } finally {
        setIsLoading(false)
      }
    },
    [currentRequestType, performInitialRequest, performFollowUpRequest, isPublic, getIssueType, sessionId, slotFillingState, setConversationId]
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
        ticketId?: string,
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
                  requestId: requestId ?? undefined,
                  ticketId: ticketId ?? undefined,
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

      const consentIssueType = getIssueType(pendingWebSearchConsent.requestType)

      try {
        let response = await performConsentRequest(message, webSearchToken, consentIssueType)
        if (response.conversationId) {
          setConversationId(response.conversationId)
        }

        if (response.requestId) {
          console.debug('[chat] requestId (consent):', response.requestId)
        }

        const ticketId = response.next?.action === 'escalate' ? response.next.ticketId : undefined

        if (response.escalation?.shouldEscalate) {
          applySuccess(
            stripDebugBlock(response.answer),
            undefined,
            response.escalation,
            response.requestId,
            ticketId,
            response.actionHints
          )
          if (response.requestId) {
            saveConversation({
              requestId: response.requestId,
              conversationId: response.conversationId ?? sessionId,
              userMessage: message,
              assistantMessage: stripDebugBlock(response.answer),
              ticketId,
              escalation: response.escalation,
              outcome: 'escalated',
              issueType: consentIssueType,
              requestType: pendingWebSearchConsent.requestType,
              createdAtUtc: new Date().toISOString()
            })
          }
        } else if (response.needsWebConfirmation && response.webSearchToken) {
          setPendingWebSearchConsent({
            message,
            webSearchToken: response.webSearchToken,
            messageId,
            requestType: pendingWebSearchConsent.requestType
          })
        } else {
          applySuccess(stripDebugBlock(response.answer), response.citations, undefined, response.requestId, ticketId, response.actionHints)
          if (response.requestId) {
            saveConversation({
              requestId: response.requestId,
              conversationId: response.conversationId ?? sessionId,
              userMessage: message,
              assistantMessage: stripDebugBlock(response.answer),
              citations: response.citations ? apiCitationsToCitations(response.citations) : undefined,
              ticketId,
              outcome: 'answered',
              issueType: consentIssueType,
              requestType: pendingWebSearchConsent.requestType,
              createdAtUtc: new Date().toISOString()
            })
          }
        }
      } catch (error) {
        const err = error as ChatServiceError

        if (err.isTokenExpiration) {
          try {
            const { response } = await performInitialRequest(message, false, undefined, consentIssueType)
            if (response.conversationId) {
              setConversationId(response.conversationId)
            }
            if (response.requestId) {
              console.debug('[chat] requestId (retry):', response.requestId)
            }
            const retryTicketId = response.next?.action === 'escalate' ? response.next.ticketId : undefined
            if (response.escalation?.shouldEscalate) {
              applySuccess(
                stripDebugBlock(response.answer),
                undefined,
                response.escalation,
                response.requestId,
                retryTicketId,
                response.actionHints
              )
            } else if (response.needsWebConfirmation && response.webSearchToken) {
              setPendingWebSearchConsent({
                message,
                webSearchToken: response.webSearchToken,
                messageId,
                requestType: pendingWebSearchConsent.requestType
              })
            } else {
              applySuccess(stripDebugBlock(response.answer), response.citations, undefined, response.requestId, retryTicketId, response.actionHints)
              if (response.requestId) {
                saveConversation({
                  requestId: response.requestId,
                  conversationId: response.conversationId ?? sessionId,
                  userMessage: message,
                  assistantMessage: stripDebugBlock(response.answer),
                  citations: response.citations ? apiCitationsToCitations(response.citations) : undefined,
                  ticketId: retryTicketId,
                  outcome: response.escalation?.shouldEscalate ? 'escalated' : 'answered',
                  issueType: consentIssueType,
                  requestType: pendingWebSearchConsent.requestType,
                  createdAtUtc: new Date().toISOString()
                })
              }
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
    [pendingWebSearchConsent, performConsentRequest, performInitialRequest, getIssueType, setConversationId]
  )

  const triggerOptionalWebSearch = useCallback(
    async (messageId: string, userMessage: string, webSearchToken?: string, requestType?: RequestType) => {
      if (webSearchToken) {
        setPendingWebSearchConsent({
          message: userMessage,
          webSearchToken,
          messageId,
          requestType
        })
      } else {
        setIsLoading(true)
        setPendingWebSearchConsent(null)
        const issueType = getIssueType(requestType)
        try {
          const { response } = await performInitialRequest(userMessage, false, null, issueType)
          if (response.conversationId) {
            setConversationId(response.conversationId)
          }
          if (response.requestId) {
            console.debug('[chat] requestId (optional web search):', response.requestId)
          }
          const ticketId = response.next?.action === 'escalate' ? response.next.ticketId : undefined
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
                      ticketId,
                      actionHints: response.actionHints,
                      optionalWebSearch: undefined
                    }
                  : msg
              )
            )
            if (response.requestId) {
              saveConversation({
                requestId: response.requestId,
                conversationId: response.conversationId ?? sessionId,
                userMessage: userMessage,
                assistantMessage: stripDebugBlock(response.answer),
                ticketId,
                escalation: response.escalation,
                outcome: 'escalated',
                issueType: getIssueType(requestType),
                requestType,
                createdAtUtc: new Date().toISOString()
              })
            }
          } else if (response.needsWebConfirmation && response.webSearchToken) {
            setPendingWebSearchConsent({
              message: userMessage,
              webSearchToken: response.webSearchToken,
              messageId,
              requestType
            })
          } else {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      content: stripDebugBlock(response.answer),
                      citations: response.citations ? apiCitationsToCitations(response.citations) : msg.citations,
                      requestId: response.requestId ?? undefined,
                      ticketId,
                      actionHints: response.actionHints?.length ? response.actionHints : msg.actionHints,
                      optionalWebSearch: undefined
                    }
                  : msg
              )
            )
            if (response.requestId) {
              saveConversation({
                requestId: response.requestId,
                conversationId: response.conversationId ?? sessionId,
                userMessage: userMessage,
                assistantMessage: stripDebugBlock(response.answer),
                citations: response.citations ? apiCitationsToCitations(response.citations) : undefined,
                ticketId,
                outcome: 'answered',
                issueType: getIssueType(requestType),
                requestType,
                createdAtUtc: new Date().toISOString()
              })
            }
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
    [performInitialRequest, getIssueType, setConversationId]
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
    setSlotFillingState(null)
    clearSession()
  }, [clearSession])

  const loadHistory = useCallback((messagesToLoad: ChatMessage[]) => {
    setMessages(messagesToLoad)
    setPendingWebSearchConsent(null)
    setSlotFillingState(null)
    const firstMsg = messagesToLoad[0]
    if (firstMsg?.requestType) {
      setCurrentRequestType(firstMsg.requestType)
    }
  }, [])

  return {
    messages,
    isLoading,
    currentRequestType,
    slotFillingState,
    pendingWebSearchConsent,
    dataBoundary,
    isPublic,
    sendMessage,
    confirmWebSearch,
    triggerOptionalWebSearch,
    submitFeedback,
    clearChat,
    loadHistory,
    setCurrentRequestType
  }
}

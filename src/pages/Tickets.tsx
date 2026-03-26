import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getTicket,
  listTicketsAll,
  listTicketsByUser,
  patchTicket,
  type TicketApiRole
} from '../services/ticketService'
import { ApiClientError } from '../services/apiClient'
import type { ApiTicket } from '../types'
import LoadingSpinner from '../components/common/LoadingSpinner'

const PRIORITY_COLORS: Record<string, string> = {
  P1: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  P2: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  P3: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  P4: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

const STATUS_BADGE: Record<string, string> = {
  Open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  InProgress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Closed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
}

function formatDate(utc: string): string {
  try {
    const d = new Date(utc)
    return d.toLocaleString()
  } catch {
    return utc
  }
}

/** Short date for list column (e.g. 3/19); full datetime stays in details panel */
function formatCreatedShort(utc: string): string {
  try {
    const d = new Date(utc)
    return d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
  } catch {
    return utc
  }
}

/** Backend: Open | InProgress | Closed */
const STATUS_OPTIONS = ['Open', 'InProgress', 'Closed'] as const

function normalizeStatus(status: string): string {
  const s = (status || '').toLowerCase().replace(/[\s_-]/g, '')
  if (s === 'open') return 'Open'
  if (s === 'processing' || s === 'inprogress' || s === 'in_progress') return 'InProgress'
  if (s === 'closed' || s === 'resolved') return 'Closed'
  return status || 'Open'
}

function toApiStatus(ui: string): string {
  if (ui === 'InProgress') return 'InProgress'
  return ui
}

const DEFAULT_PAGE_SIZE = 20

export default function Tickets() {
  const { user, role } = useAuth()
  const isPrivileged = role === 'Agent' || role === 'Admin'
  const ticketApiRole: TicketApiRole = role === 'Admin' ? 'admin' : 'agent'
  const pageTitle = role === 'Customer' ? 'My Tickets' : 'Tickets'

  const [tickets, setTickets] = useState<ApiTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<ApiTicket | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null)
  /** Draft status in UI until user confirms Save (Agent/Admin) */
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize] = useState(DEFAULT_PAGE_SIZE)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  /** Server filters (Agent/Admin): updated on Apply, not on every keystroke */
  const [appliedStatus, setAppliedStatus] = useState('')
  const [appliedPriority, setAppliedPriority] = useState('')
  const [appliedIssueType, setAppliedIssueType] = useState('')
  const [appliedAssignedTo, setAppliedAssignedTo] = useState('')

  const [pendingStatus, setPendingStatus] = useState('')
  const [pendingPriority, setPendingPriority] = useState('')
  const [pendingIssueType, setPendingIssueType] = useState('')
  const [pendingAssignedTo, setPendingAssignedTo] = useState('')

  const loadList = useCallback(async () => {
    if (!user?.username) return

    setLoading(true)
    setError('')
    try {
      if (!isPrivileged) {
        const list = await listTicketsByUser(user.username)
        setTickets(list)
        setTotal(list.length)
        setTotalPages(1)
        return
      }

      const res = await listTicketsAll({
        role: ticketApiRole,
        page,
        pageSize,
        ...(appliedStatus ? { status: appliedStatus } : {}),
        ...(appliedPriority ? { priority: appliedPriority } : {}),
        ...(appliedIssueType.trim() ? { issueType: appliedIssueType.trim() } : {}),
        ...(appliedAssignedTo.trim() ? { assignedTo: appliedAssignedTo.trim() } : {})
      })
      setTickets(res.tickets)
      setTotal(res.total)
      setTotalPages(Math.max(1, res.totalPages || 1))
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load tickets'
      setError(msg)
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [
    user?.username,
    isPrivileged,
    ticketApiRole,
    page,
    pageSize,
    appliedStatus,
    appliedPriority,
    appliedIssueType,
    appliedAssignedTo
  ])

  useEffect(() => {
    if (!user?.username) {
      setLoading(false)
      return
    }
    void loadList()
  }, [user?.username, loadList])

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tickets
    return tickets.filter((t) => {
      const haystack = [
        t.ticketId,
        t.status,
        t.priority,
        t.issueType,
        t.createdByUser,
        t.summary,
        t.assignedTo
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [tickets, search])

  const activeCount = useMemo(
    () => tickets.filter((t) => normalizeStatus(t.status) !== 'Closed').length,
    [tickets]
  )

  const handleViewTicket = async (ticketId: string) => {
    setLoadingDetail(true)
    setSelectedTicket(null)
    try {
      const ticket = await getTicket(ticketId)
      setSelectedTicket(ticket)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket')
    } finally {
      setLoadingDetail(false)
    }
  }

  const mergeUpdated = (ticketId: string, updated: ApiTicket) => {
    setTickets((prev) => prev.map((t) => (t.ticketId === ticketId ? { ...t, ...updated } : t)))
    setSelectedTicket((prev) => (prev?.ticketId === ticketId ? { ...prev, ...updated } : prev))
    setStatusDrafts((prev) => {
      const next = { ...prev }
      delete next[ticketId]
      return next
    })
  }

  const handleSaveStatus = async (ticketId: string, nextUiStatus: string) => {
    if (!isPrivileged) return
    setError('')
    setUpdatingTicketId(ticketId)
    try {
      const updated = await patchTicket(ticketId, ticketApiRole, { status: toApiStatus(nextUiStatus) })
      mergeUpdated(ticketId, updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket status')
    } finally {
      setUpdatingTicketId(null)
    }
  }

  const handleCancelStatusDraft = (ticketId: string) => {
    setStatusDrafts((prev) => {
      const next = { ...prev }
      delete next[ticketId]
      return next
    })
  }

  const handleAssignToMe = async (ticketId: string) => {
    if (!isPrivileged || !user?.username) return
    setError('')
    setUpdatingTicketId(ticketId)
    try {
      const updated = await patchTicket(ticketId, ticketApiRole, {
        assignedTo: user.username,
        status: 'InProgress'
      })
      mergeUpdated(ticketId, updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign ticket')
    } finally {
      setUpdatingTicketId(null)
    }
  }

  const applyFilters = () => {
    setAppliedStatus(pendingStatus)
    setAppliedPriority(pendingPriority)
    setAppliedIssueType(pendingIssueType)
    setAppliedAssignedTo(pendingAssignedTo)
    setPage(1)
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-600 dark:text-gray-400">Please log in to view your tickets.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {pageTitle}
        </h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Active: <span className="font-semibold text-gray-900 dark:text-white">{activeCount}</span>
            {isPrivileged && (
              <span className="ml-2">
                · Total: <span className="font-semibold text-gray-900 dark:text-white">{total}</span>
              </span>
            )}
          </div>
          {role === 'Customer' && (
            <Link
              to="/create-ticket"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New Ticket
            </Link>
          )}
        </div>
      </div>

      {isPrivileged && (
        <div className="mb-4 flex flex-wrap gap-3 items-end p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <select
              value={pendingStatus}
              onChange={(e) => setPendingStatus(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 dark:text-white text-sm"
            >
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Priority</label>
            <select
              value={pendingPriority}
              onChange={(e) => setPendingPriority(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 dark:text-white text-sm"
            >
              <option value="">All</option>
              {['P1', 'P2', 'P3', 'P4'].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Issue type</label>
            <input
              type="text"
              value={pendingIssueType}
              onChange={(e) => setPendingIssueType(e.target.value)}
              placeholder="e.g. VPN"
              className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 dark:text-white text-sm w-32"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Assigned to</label>
            <input
              type="text"
              value={pendingAssignedTo}
              onChange={(e) => setPendingAssignedTo(e.target.value)}
              placeholder="username"
              className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 dark:text-white text-sm w-36"
            />
          </div>
          <button
            type="button"
            onClick={applyFilters}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Apply filters
          </button>
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search current list (ID, status, priority, summary...)"
          className="w-full max-w-xl px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-8">
          <LoadingSpinner size="md" />
          <span className="text-gray-600 dark:text-gray-400">Loading tickets...</span>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center text-gray-600 dark:text-gray-400">
          <p className="mb-4">{search.trim() ? 'No matching tickets found.' : 'No tickets found.'}</p>
          {role === 'Customer' && (
            <Link
              to="/create-ticket"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New Ticket
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      Actions
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Ticket ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Priority</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Issue Type</th>
                    {isPrivileged && (
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Assigned</th>
                    )}
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTickets.map((t) => {
                    const ns = normalizeStatus(t.status)
                    const statusValue = statusDrafts[t.ticketId] ?? ns
                    const statusDirty = isPrivileged && statusValue !== ns
                    return (
                      <tr key={t.ticketId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-col gap-1 items-start min-w-[5.5rem]">
                            <button
                              type="button"
                              onClick={() => handleViewTicket(t.ticketId)}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                            >
                              View
                            </button>
                            {isPrivileged && (
                              <button
                                type="button"
                                onClick={() => handleAssignToMe(t.ticketId)}
                                disabled={updatingTicketId === t.ticketId}
                                className="text-xs text-amber-700 dark:text-amber-400 hover:underline disabled:opacity-50 whitespace-nowrap"
                              >
                                Assign to me
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">
                          {t.ticketId.slice(0, 12)}...
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 align-top">
                          {isPrivileged ? (
                            <div className="flex flex-col gap-1 max-w-[11rem]">
                              <select
                                value={statusValue}
                                onChange={(e) =>
                                  setStatusDrafts((prev) => ({
                                    ...prev,
                                    [t.ticketId]: e.target.value
                                  }))
                                }
                                disabled={updatingTicketId === t.ticketId}
                                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 dark:text-white text-xs w-full"
                              >
                                {[...new Set([...STATUS_OPTIONS, ns, statusValue])].map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                              {statusDirty && (
                                <div className="flex flex-wrap gap-1">
                                  <button
                                    type="button"
                                    onClick={() => void handleSaveStatus(t.ticketId, statusValue)}
                                    disabled={updatingTicketId === t.ticketId}
                                    className="px-2 py-0.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCancelStatusDraft(t.ticketId)}
                                    disabled={updatingTicketId === t.ticketId}
                                    className="px-2 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                STATUS_BADGE[ns] ?? 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {ns}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.P4
                            }`}
                          >
                            {t.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{t.issueType}</td>
                        {isPrivileged && (
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[8rem] truncate">
                            {t.assignedTo ?? '—'}
                          </td>
                        )}
                        <td
                          className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap"
                          title={formatDate(t.createdUtc)}
                        >
                          {formatCreatedShort(t.createdUtc)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {isPrivileged && totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 dark:bg-gray-800"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 dark:bg-gray-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            {loadingDetail ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-gray-500">Loading...</span>
              </div>
            ) : selectedTicket ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ticket Details</h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Ticket ID</dt>
                    <dd className="font-mono text-gray-900 dark:text-white">{selectedTicket.ticketId}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Status</dt>
                    <dd className="text-gray-900 dark:text-white">{normalizeStatus(selectedTicket.status)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Priority</dt>
                    <dd>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          PRIORITY_COLORS[selectedTicket.priority] ?? PRIORITY_COLORS.P4
                        }`}
                      >
                        {selectedTicket.priority}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Issue Type</dt>
                    <dd className="text-gray-900 dark:text-white">{selectedTicket.issueType}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Source</dt>
                    <dd className="text-gray-900 dark:text-white capitalize">{selectedTicket.source}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Created By</dt>
                    <dd className="text-gray-900 dark:text-white">{selectedTicket.createdByUser}</dd>
                  </div>
                  {selectedTicket.assignedTo && (
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Assigned To</dt>
                      <dd className="text-gray-900 dark:text-white">{selectedTicket.assignedTo}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Summary</dt>
                    <dd className="text-gray-900 dark:text-white">{selectedTicket.summary}</dd>
                  </div>
                  {selectedTicket.escalationReason && (
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Escalation Reason</dt>
                      <dd className="text-gray-900 dark:text-white">{selectedTicket.escalationReason}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                    <dd className="text-gray-900 dark:text-white">{formatDate(selectedTicket.createdUtc)}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="mt-4 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-400"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                Click &quot;View&quot; on a ticket to see details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

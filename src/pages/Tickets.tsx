import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listTicketsByUser, getTicket } from '../services/ticketService'
import type { ApiTicket } from '../types'
import LoadingSpinner from '../components/common/LoadingSpinner'

const PRIORITY_COLORS: Record<string, string> = {
  P1: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  P2: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  P3: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  P4: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

function formatDate(utc: string): string {
  try {
    const d = new Date(utc)
    return d.toLocaleString()
  } catch {
    return utc
  }
}

export default function Tickets() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<ApiTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<ApiTicket | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (!user?.username) {
      setLoading(false)
      return
    }

    listTicketsByUser(user.username)
      .then(setTickets)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load tickets'))
      .finally(() => setLoading(false))
  }, [user?.username])

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
          My Tickets
        </h1>
        <Link
          to="/create-ticket"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create New Ticket
        </Link>
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
      ) : tickets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center text-gray-600 dark:text-gray-400">
          <p className="mb-4">You have no tickets yet.</p>
          <Link
            to="/create-ticket"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create New Ticket
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Ticket ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Priority</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Issue Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Created</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tickets.map((t) => (
                    <tr key={t.ticketId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">
                        {t.ticketId.slice(0, 12)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{t.status}</td>
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
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(t.createdUtc)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleViewTicket(t.ticketId)}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                    <dd className="text-gray-900 dark:text-white">{selectedTicket.status}</dd>
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

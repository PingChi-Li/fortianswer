import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '../contexts/UserContext'
import { useAuth } from '../contexts/AuthContext'
import { listTicketsAll, listTicketsByUser } from '../services/ticketService'
import type { ApiTicket } from '../types'

const SECURITY_STATUS = 'Normal'

const MOCK_RECENT_ACTIVITY = [
  { id: '1', type: 'chat' as const, title: 'Phishing email question', link: '/chat', at: new Date(Date.now() - 3600000) },
  { id: '2', type: 'policy' as const, title: 'Phishing Prevention Policy', link: '/knowledge', at: new Date(Date.now() - 7200000) },
  { id: '3', type: 'chat' as const, title: 'VPN connection help', link: '/chat', at: new Date(Date.now() - 86400000) }
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Landing() {
  const { user } = useUser()
  const { role, user: authUser } = useAuth()
  const recent = MOCK_RECENT_ACTIVITY
  const [tickets, setTickets] = useState<ApiTicket[]>([])
  const [ticketLoading, setTicketLoading] = useState(true)

  useEffect(() => {
    const username = authUser?.username
    if (!username) {
      setTicketLoading(false)
      setTickets([])
      return
    }

    setTicketLoading(true)
    const load =
      role === 'Customer'
        ? listTicketsByUser(username)
        : listTicketsAll({
            role: role === 'Admin' ? 'admin' : 'agent',
            page: 1,
            pageSize: 500
          }).then((r) => r.tickets)

    load
      .then(setTickets)
      .catch(() => setTickets([]))
      .finally(() => setTicketLoading(false))
  }, [authUser?.username, role])

  const ticketSummary = useMemo(() => {
    const active = tickets.filter((t) => {
      const ns = (t.status || '').toLowerCase().replace(/[\s_-]/g, '')
      return ns !== 'closed' && ns !== 'resolved'
    }).length
    const critical = tickets.filter((t) => (t.priority || '').toUpperCase() === 'P1').length
    return { active, critical }
  }, [tickets])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {getGreeting()}, {user.name}.
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Security Status: <span className="font-medium text-green-600 dark:text-green-400">{SECURITY_STATUS}</span>
          </p>
        </div>

        {/* Quick Actions Grid */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Link
            to="/chat"
            className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Start New Chat</h3>
            <p className="text-gray-600 dark:text-gray-400">Get instant help from the AI assistant</p>
          </Link>
          <Link
            to="/knowledge"
            className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Search Policies</h3>
            <p className="text-gray-600 dark:text-gray-400">Browse FAQs and security policies</p>
          </Link>
          <Link
            to="/create-ticket"
            className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Report Incident</h3>
            <p className="text-gray-600 dark:text-gray-400">Create a support ticket</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
            <ul className="space-y-3">
              {recent.map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.link}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-gray-800 dark:text-gray-200">{item.title}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {item.type === 'chat' ? 'Chat' : 'Policy'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Ticket Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Ticket Summary</h2>
            <div className="flex items-center gap-6">
              <div>
                <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {ticketLoading ? '...' : ticketSummary.active}
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">Active Tickets</span>
              </div>
              <div>
                <span className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {ticketLoading ? '...' : ticketSummary.critical}
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">Critical</span>
              </div>
            </div>
            <Link
              to="/tickets"
              className="inline-block mt-4 text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              View all tickets →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

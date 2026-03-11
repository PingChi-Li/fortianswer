import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RequestType } from '../types'
import { REQUEST_TYPE_TO_ISSUE_TYPE } from '../types'
import { REQUEST_TYPES } from '../utils/constants'
import { useAuth } from '../contexts/AuthContext'
import { createTicket } from '../services/ticketService'
import { ROLE_TO_DATA_BOUNDARY } from '../types'

export default function CreateTicket() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requestType: 'general' as RequestType
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.username) {
      setError('You must be logged in to create a ticket')
      return
    }

    const summary = formData.title.trim()
      ? `${formData.title.trim()}: ${formData.description.trim()}`
      : formData.description.trim()

    if (!summary) {
      setError('Please provide a description of the issue')
      return
    }

    setError('')
    setLoading(true)

    try {
      const dataBoundary = ROLE_TO_DATA_BOUNDARY[user.role]
      const issueType = REQUEST_TYPE_TO_ISSUE_TYPE[formData.requestType]

      const result = await createTicket({
        username: user.username,
        summary,
        issueType,
        dataBoundary
      })

      setCreatedTicketId(result.ticketId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  if (createdTicketId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl">
          <h2 className="text-xl font-bold text-green-600 dark:text-green-400 mb-4">
            Ticket Created Successfully
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            Ticket ID: <span className="font-mono font-semibold">{createdTicketId}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            An authorized responder will follow up with you.
          </p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View My Tickets
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatedTicketId(null)
                setFormData({ title: '', description: '', requestType: 'general' })
              }}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Create Support Ticket
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="Brief description of the issue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Request Type
            </label>
            <select
              value={formData.requestType}
              onChange={(e) => setFormData({ ...formData, requestType: e.target.value as RequestType })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              {REQUEST_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="Provide detailed information about the issue..."
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Ticket'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

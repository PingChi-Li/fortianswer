import { Link } from 'react-router-dom'

export default function Tickets() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        My Tickets
      </h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center text-gray-600 dark:text-gray-400">
        <p className="mb-4">View and manage your support tickets.</p>
        <Link
          to="/create-ticket"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create New Ticket
        </Link>
      </div>
    </div>
  )
}

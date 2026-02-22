import { useLocation, useNavigate } from 'react-router-dom'

export default function Escalate() {
  const location = useLocation()
  const navigate = useNavigate()
  const issueData = location.state || {
    issue: '',
    attemptedSolutions: ''
  }

  const handleSubmit = () => {
    // In a real implementation, this would transfer the issue to human agents
    console.log('Escalating issue:', issueData)
    alert('Issue has been escalated to human agents. You will be contacted shortly.')
    navigate('/')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Escalate Issue
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl">
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The following information will be transferred to our human support agents:
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Issue Description
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {issueData.issue || 'No issue description provided'}
              </p>
            </div>
          </div>

          {issueData.attemptedSolutions && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Attempted Solutions
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {issueData.attemptedSolutions}
                </p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Additional Information
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Timestamp: {new Date().toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                User: Current logged-in user
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Confirm Escalation
          </button>
          <button
            onClick={() => navigate('/contact-support')}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}

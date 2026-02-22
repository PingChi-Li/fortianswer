import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ContactSupport() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    issue: '',
    attemptedSolutions: '',
    needsEscalation: false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.needsEscalation) {
      navigate('/escalate', { state: formData })
    } else {
      alert('Your support request has been submitted. We will contact you shortly.')
      navigate('/')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Contact Support
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl">
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Please describe your issue and any solutions you've already tried. 
          We'll help determine if this needs to be escalated to a human agent.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Describe your issue
            </label>
            <textarea
              value={formData.issue}
              onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="What issue are you experiencing?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Solutions you've already tried
            </label>
            <textarea
              value={formData.attemptedSolutions}
              onChange={(e) => setFormData({ ...formData, attemptedSolutions: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="What have you already tried to resolve this issue?"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="needsEscalation"
              checked={formData.needsEscalation}
              onChange={(e) => setFormData({ ...formData, needsEscalation: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <label htmlFor="needsEscalation" className="text-sm text-gray-700 dark:text-gray-300">
              This issue requires escalation to a human agent
            </label>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {formData.needsEscalation ? 'Escalate Issue' : 'Submit Request'}
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

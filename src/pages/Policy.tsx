import { useState } from 'react'
import { Policy } from '../types'

export default function PolicyPage() {
  const [policies, setPolicies] = useState<Policy[]>([
    {
      id: '1',
      title: 'Phishing Prevention Policy',
      content: 'All employees must be vigilant about phishing attempts. Never click suspicious links or provide credentials via email.',
      category: 'Security',
      published: true,
      suspended: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      title: 'Password Security Policy',
      content: 'Passwords must be at least 12 characters long, include uppercase, lowercase, numbers, and special characters.',
      category: 'Security',
      published: true,
      suspended: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ])

  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: ''
  })

  const handleCreate = () => {
    setIsCreating(true)
    setFormData({ title: '', content: '', category: '' })
  }

  const handleEdit = (policy: Policy) => {
    setEditingId(policy.id)
    setFormData({
      title: policy.title,
      content: policy.content,
      category: policy.category || ''
    })
  }

  const handleSave = () => {
    if (editingId) {
      setPolicies(policies.map(policy =>
        policy.id === editingId
          ? { ...policy, ...formData, updatedAt: new Date() }
          : policy
      ))
      setEditingId(null)
    } else {
      const newPolicy: Policy = {
        id: Date.now().toString(),
        ...formData,
        published: false,
        suspended: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      setPolicies([...policies, newPolicy])
      setIsCreating(false)
    }
    setFormData({ title: '', content: '', category: '' })
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this policy?')) {
      setPolicies(policies.filter(policy => policy.id !== id))
    }
  }

  const handleTogglePublish = (id: string) => {
    setPolicies(policies.map(policy =>
      policy.id === id ? { ...policy, published: !policy.published } : policy
    ))
  }

  const handleToggleSuspend = (id: string) => {
    setPolicies(policies.map(policy =>
      policy.id === id ? { ...policy, suspended: !policy.suspended } : policy
    ))
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Security Policy Management
        </h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Create Policy
        </button>
      </div>

      {(isCreating || editingId) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            {editingId ? 'Edit Policy' : 'Create New Policy'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsCreating(false)
                  setEditingId(null)
                  setFormData({ title: '', content: '', category: '' })
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {policies.map((policy) => (
          <div
            key={policy.id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${
              policy.suspended ? 'opacity-60' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {policy.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-2 whitespace-pre-wrap">
                  {policy.content}
                </p>
                {policy.category && (
                  <span className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                    {policy.category}
                  </span>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleTogglePublish(policy.id)}
                  className={`px-3 py-1 text-sm rounded ${
                    policy.published
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                  }`}
                >
                  {policy.published ? 'Published' : 'Unpublished'}
                </button>
                <button
                  onClick={() => handleToggleSuspend(policy.id)}
                  className={`px-3 py-1 text-sm rounded ${
                    policy.suspended
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                  }`}
                >
                  {policy.suspended ? 'Suspended' : 'Active'}
                </button>
                <button
                  onClick={() => handleEdit(policy)}
                  className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(policy.id)}
                  className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

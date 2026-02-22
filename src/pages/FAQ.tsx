import { useState } from 'react'
import { FAQ } from '../types'

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([
    {
      id: '1',
      question: 'How do I report a phishing email?',
      answer: 'Forward the suspicious email to security@company.com and do not click any links.',
      category: 'Security',
      published: true,
      suspended: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      question: 'What should I do if I suspect unauthorized access?',
      answer: 'Immediately change your password, enable MFA, and contact IT support.',
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
    question: '',
    answer: '',
    category: ''
  })

  const handleCreate = () => {
    setIsCreating(true)
    setFormData({ question: '', answer: '', category: '' })
  }

  const handleEdit = (faq: FAQ) => {
    setEditingId(faq.id)
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || ''
    })
  }

  const handleSave = () => {
    if (editingId) {
      setFaqs(faqs.map(faq =>
        faq.id === editingId
          ? { ...faq, ...formData, updatedAt: new Date() }
          : faq
      ))
      setEditingId(null)
    } else {
      const newFaq: FAQ = {
        id: Date.now().toString(),
        ...formData,
        published: false,
        suspended: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      setFaqs([...faqs, newFaq])
      setIsCreating(false)
    }
    setFormData({ question: '', answer: '', category: '' })
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this FAQ?')) {
      setFaqs(faqs.filter(faq => faq.id !== id))
    }
  }

  const handleTogglePublish = (id: string) => {
    setFaqs(faqs.map(faq =>
      faq.id === id ? { ...faq, published: !faq.published } : faq
    ))
  }

  const handleToggleSuspend = (id: string) => {
    setFaqs(faqs.map(faq =>
      faq.id === id ? { ...faq, suspended: !faq.suspended } : faq
    ))
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          FAQ Management
        </h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Create FAQ
        </button>
      </div>

      {(isCreating || editingId) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            {editingId ? 'Edit FAQ' : 'Create New FAQ'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Question
              </label>
              <input
                type="text"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Answer
              </label>
              <textarea
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                rows={4}
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
                  setFormData({ question: '', answer: '', category: '' })
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
        {faqs.map((faq) => (
          <div
            key={faq.id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${
              faq.suspended ? 'opacity-60' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {faq.question}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-2">{faq.answer}</p>
                {faq.category && (
                  <span className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                    {faq.category}
                  </span>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleTogglePublish(faq.id)}
                  className={`px-3 py-1 text-sm rounded ${
                    faq.published
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                  }`}
                >
                  {faq.published ? 'Published' : 'Unpublished'}
                </button>
                <button
                  onClick={() => handleToggleSuspend(faq.id)}
                  className={`px-3 py-1 text-sm rounded ${
                    faq.suspended
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                  }`}
                >
                  {faq.suspended ? 'Suspended' : 'Active'}
                </button>
                <button
                  onClick={() => handleEdit(faq)}
                  className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(faq.id)}
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

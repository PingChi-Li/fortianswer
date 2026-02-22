interface WebSearchConsentModalProps {
  open: boolean
  onYes: () => void
  onNo: () => void
}

export default function WebSearchConsentModal({ open, onYes, onNo }: WebSearchConsentModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border-2 border-amber-500/50"
        role="dialog"
        aria-labelledby="web-search-consent-title"
        aria-modal="true"
      >
        <h2
          id="web-search-consent-title"
          className="text-xl font-bold text-gray-900 dark:text-white mb-4"
        >
          Allow Web Search?
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          To provide a complete answer, the assistant can search the web for additional
          information. Would you like to allow this?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onYes}
            className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={onNo}
            className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
          >
            No
          </button>
        </div>
      </div>
    </div>
  )
}

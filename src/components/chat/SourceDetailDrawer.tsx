import { Link } from 'react-router-dom'
import { Citation } from '../../types'

function isUrl(str: string): boolean {
  try {
    return str.startsWith('http://') || str.startsWith('https://')
  } catch {
    return false
  }
}

interface SourceDetailDrawerProps {
  citation: Citation | null
  onClose: () => void
}

export default function SourceDetailDrawer({ citation, onClose }: SourceDetailDrawerProps) {
  if (!citation) return null

  const externalUrl = (citation.urlOrId && isUrl(citation.urlOrId))
    ? citation.urlOrId
    : (citation.link && isUrl(citation.link)) ? citation.link : null
  const internalPath = citation.link && !isUrl(citation.link) ? citation.link : null
  const isInternal = citation.urlOrId && !isUrl(citation.urlOrId)
  const displayTitle = citation.sourceName ?? (isInternal ? 'Internal document' : 'Source')

  return (
    <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col border-l border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Source Details</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {citation.securityClassification && (
          <div className="mb-4 px-3 py-2 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 font-medium text-sm">
            Security Classification: {citation.securityClassification}
          </div>
        )}
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">{displayTitle}</h4>
        {isInternal && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Internal document</p>
        )}
        {citation.section && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Section: {citation.section}</p>
        )}
        {citation.snippet && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {citation.snippet}
            </p>
          </div>
        )}
        {externalUrl && (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            Open full document →
          </a>
        )}
        {internalPath && !externalUrl && (
          <Link
            to={internalPath}
            className="inline-block mt-4 text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            Open full document →
          </Link>
        )}
        {isInternal && !externalUrl && !internalPath && (
          <span className="text-sm text-gray-500 dark:text-gray-400 mt-4 block">Internal document</span>
        )}
      </div>
    </div>
  )
}

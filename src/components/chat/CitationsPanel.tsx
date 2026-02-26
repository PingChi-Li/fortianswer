import { Citation } from '../../types'
import { Link } from 'react-router-dom'

function isUrl(str: string): boolean {
  try {
    return str.startsWith('http://') || str.startsWith('https://')
  } catch {
    return false
  }
}

interface CitationsPanelProps {
  citations: Citation[]
}

export default function CitationsPanel({ citations }: CitationsPanelProps) {
  if (!citations || citations.length === 0) return null

  return (
    <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
      <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
        Sources:
      </h4>
      <ul className="space-y-2">
        {citations.map((citation) => {
          const href = citation.urlOrId && isUrl(citation.urlOrId)
            ? citation.urlOrId
            : citation.link && isUrl(citation.link)
              ? citation.link
              : null
          const internalPath = citation.link && !isUrl(citation.link) ? citation.link : null
          const label = citation.sourceName || (citation.urlOrId && !isUrl(citation.urlOrId) ? 'Internal document' : 'Source')
          const scorePart = citation.score != null && label !== 'Internal document' ? ` (score: ${citation.score.toFixed(5)})` : ''
          const extra = citation.section ? ` - ${citation.section}` : citation.snippet ? ` - ${citation.snippet.slice(0, 60)}${citation.snippet.length > 60 ? '...' : ''}` : ''

          return (
            <li key={citation.id} className="text-sm">
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {label}{scorePart}{extra}
                </a>
              ) : internalPath ? (
                <Link
                  to={internalPath}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {label}{scorePart}{extra}
                </Link>
              ) : (
                <span className="text-gray-600 dark:text-gray-400">
                  {citation.urlOrId && !citation.sourceName ? 'Internal document' : label}{scorePart}{extra}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

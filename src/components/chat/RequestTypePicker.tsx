import { RequestType } from '../../types'
import { REQUEST_TYPES } from '../../utils/constants'

interface RequestTypePickerProps {
  onSelect: (requestType: RequestType) => void
  selectedType?: RequestType | null
}

export default function RequestTypePicker({ onSelect, selectedType }: RequestTypePickerProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 md:p-6">
      {REQUEST_TYPES.map((type) => (
        <button
          key={type.value}
          onClick={() => onSelect(type.value)}
          className={`p-4 md:p-6 rounded-lg border-2 transition-all text-left hover:scale-105 ${
            selectedType === type.value
              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
              : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:shadow-md bg-white dark:bg-gray-800'
          }`}
        >
          <h3 className="text-lg md:text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">
            {type.label}
          </h3>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
            {type.description}
          </p>
        </button>
      ))}
    </div>
  )
}

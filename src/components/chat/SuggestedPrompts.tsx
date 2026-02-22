interface SuggestedPromptsProps {
  prompts: string[]
  onSelect: (prompt: string) => void
}

export default function SuggestedPrompts({ prompts, onSelect }: SuggestedPromptsProps) {
  if (!prompts || prompts.length === 0) return null

  return (
    <div className="mb-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Suggested prompts:</p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onSelect(prompt)}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}

import { Folder, Search } from 'lucide-react'

interface EmptyStateProps {
  type: 'no-projects' | 'no-results' | 'no-config'
  onAction?: () => void
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  if (type === 'no-config') {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-stone-800 rounded-2xl">
        <Folder className="text-stone-700 mb-4" size={48} />
        <p className="text-stone-400 mb-2">No scan directories configured</p>
        <p className="text-stone-500 text-sm mb-4">Add directories in Settings to discover your projects</p>
        {onAction && (
          <button onClick={onAction} className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            Open Settings
          </button>
        )}
      </div>
    )
  }

  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-stone-800 rounded-2xl">
        <Search className="text-stone-700 mb-4" size={48} />
        <p className="text-stone-400">No projects match your search or filter.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-64 border border-dashed border-stone-800 rounded-2xl">
      <Folder className="text-stone-700 mb-4" size={48} />
      <p className="text-stone-400 mb-2">No projects found</p>
      <p className="text-stone-500 text-sm">Click "Scan Now" to discover your projects</p>
    </div>
  )
}

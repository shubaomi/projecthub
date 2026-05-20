import { Folder, LayoutGrid, Settings } from 'lucide-react'
import type { TypeGroup } from '../types'

interface SidebarProps {
  typeGroups: TypeGroup[]
  activeCategory: string
  onCategoryChange: (category: string) => void
  onSettingsClick: () => void
}

export function Sidebar({ typeGroups, activeCategory, onCategoryChange, onSettingsClick }: SidebarProps) {
  const total = typeGroups.reduce((sum, g) => sum + g.count, 0)

  return (
    <div className="w-64 border-r border-stone-800 bg-stone-950/50 flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3 text-stone-100 font-semibold text-lg tracking-tight">
          <div className="bg-orange-500 p-1.5 rounded-lg text-white">
            <Folder size={20} strokeWidth={2.5} />
          </div>
          Project Hub
        </div>
      </div>

      <div className="px-4 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">Categories</div>
      <div className="px-3 flex-1 overflow-y-auto space-y-1">
        <CategoryButton key="all" label="All" count={total} isActive={activeCategory === 'All'} onClick={() => onCategoryChange('All')} />
        {typeGroups.filter(g => g.count > 0).map((group) => (
          <CategoryButton key={group.type} label={group.type} count={group.count} isActive={activeCategory === group.type} onClick={() => onCategoryChange(group.type)} />
        ))}
      </div>

      <div className="p-4 border-t border-stone-800">
        <button
          onClick={onSettingsClick}
          className="flex items-center gap-3 text-sm text-stone-400 hover:text-stone-200 w-full px-3 py-2 rounded-lg hover:bg-stone-800/50 transition-colors"
        >
          <Settings size={18} /> Settings
        </button>
      </div>
    </div>
  )
}

interface CategoryButtonProps {
  label: string
  count: number
  isActive: boolean
  onClick: () => void
}

function CategoryButton({ label, count, isActive, onClick }: CategoryButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between
        ${isActive ? 'bg-stone-800 text-stone-100 font-medium' : 'hover:bg-stone-800/50 text-stone-400 hover:text-stone-200'}`}
    >
      <span className="flex items-center gap-3">
        <LayoutGrid size={16} />{label}
      </span>
      <span className="text-xs text-stone-500">{count}</span>
    </button>
  )
}

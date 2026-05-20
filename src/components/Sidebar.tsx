import { Folder, LayoutGrid, Settings, Tag } from 'lucide-react'
import type { TypeGroup, CategoryDefinition, Project } from '../types'
import { useI18n } from '../i18n'

interface SidebarProps {
  typeGroups: TypeGroup[]
  customCategories: CategoryDefinition[]
  projects: Project[]
  activeCategory: string
  onCategoryChange: (category: string) => void
  onSettingsClick: () => void
}

export function Sidebar({ typeGroups, customCategories, projects, activeCategory, onCategoryChange, onSettingsClick }: SidebarProps) {
  const { t } = useI18n()
  const total = typeGroups.reduce((sum, g) => sum + g.count, 0)

  // Count projects per custom category
  const categoryCounts = new Map<string, number>()
  for (const cat of customCategories) {
    categoryCounts.set(cat.id, projects.filter(p => p.customCategory === cat.id).length)
  }

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

      {customCategories.length > 0 && (
        <>
          <div className="px-4 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">{t('sidebar.customCategories')}</div>
          <div className="px-3 space-y-1">
            <CategoryButton key="all" label={t('sidebar.all')} count={total} isActive={activeCategory === 'All'} onClick={() => onCategoryChange('All')} />
            {customCategories.map((cat) => (
              <CategoryButton
                key={cat.id}
                label={cat.name}
                count={categoryCounts.get(cat.id) || 0}
                isActive={activeCategory === cat.id}
                color={cat.color}
                onClick={() => onCategoryChange(cat.id)}
              />
            ))}
          </div>
        </>
      )}

      <div className="px-4 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">{t('sidebar.techStack')}</div>
      <div className="px-3 flex-1 overflow-y-auto space-y-1">
        {customCategories.length === 0 && (
          <CategoryButton key="all" label="All" count={total} isActive={activeCategory === 'All'} onClick={() => onCategoryChange('All')} />
        )}
        {typeGroups.filter(g => g.count > 0).map((group) => (
          <CategoryButton key={group.type} label={group.type} count={group.count} isActive={activeCategory === group.type} onClick={() => onCategoryChange(group.type)} />
        ))}
      </div>

      <div className="p-4 border-t border-stone-800">
        <button
          onClick={onSettingsClick}
          className="flex items-center gap-3 text-sm text-stone-400 hover:text-stone-200 w-full px-3 py-2 rounded-lg hover:bg-stone-800/50 transition-colors"
        >
          <Settings size={18} /> {t('sidebar.settings')}
        </button>
      </div>
    </div>
  )
}

interface CategoryButtonProps {
  label: string
  count: number
  isActive: boolean
  color?: string
  onClick: () => void
}

function CategoryButton({ label, count, isActive, color, onClick }: CategoryButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between
        ${isActive ? 'bg-stone-800 text-stone-100 font-medium' : 'hover:bg-stone-800/50 text-stone-400 hover:text-stone-200'}`}
    >
      <span className="flex items-center gap-3">
        {color ? <Tag size={16} style={{ color }} /> : <LayoutGrid size={16} />}{label}
      </span>
      <span className="text-xs text-stone-500">{count}</span>
    </button>
  )
}

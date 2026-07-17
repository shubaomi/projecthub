import { useState, type DragEvent } from 'react'
import { LayoutGrid, Settings, Tag, ChevronDown, CircleDashed } from 'lucide-react'
import type { TypeGroup, CategoryDefinition, Project } from '../types'
import { useI18n } from '../i18n'
import { isProjectUncategorized, UNCATEGORIZED_FILTER } from '../utils/projectCategories'

interface SidebarProps {
  typeGroups: TypeGroup[]
  customCategories: CategoryDefinition[]
  projects: Project[]
  activeCategory: string
  onCategoryChange: (category: string) => void
  onSettingsClick: () => void
  onReorderCategories: (categories: CategoryDefinition[]) => void
}

export function Sidebar({ typeGroups, customCategories, projects, activeCategory, onCategoryChange, onSettingsClick, onReorderCategories }: SidebarProps) {
  const { t } = useI18n()
  const total = typeGroups.reduce((sum, g) => sum + g.count, 0)

  const categoryCounts = new Map<string, number>()
  const validCategoryIds = new Set(customCategories.map((category) => category.id))
  for (const cat of customCategories) {
    categoryCounts.set(cat.id, projects.filter(p => p.customCategory === cat.id).length)
  }
  const uncategorizedCount = projects.filter((project) => isProjectUncategorized(project, validCategoryIds)).length

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [techStackOpen, setTechStackOpen] = useState(false)

  function handleDragStart(index: number) {
    setDragIndex(index)
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault()
    setDragOverIndex(index)
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) return
    const reordered = [...customCategories]
    const [removed] = reordered.splice(dragIndex, 1)
    reordered.splice(index, 0, removed)
    onReorderCategories(reordered)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  function handleDragEnd() {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="w-64 border-r border-stone-800 bg-stone-950/50 flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3 text-stone-100 font-semibold text-lg tracking-tight">
          <ProjectHubMark />
          Project Hub
        </div>
      </div>

      {/* Unified scrollable area: custom categories + tech stack */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">{t('sidebar.customCategories')}</div>
        <div className="px-3 space-y-1">
          <CategoryButton
            label={t('sidebar.all')}
            count={total}
            isActive={activeCategory === 'All'}
            onClick={() => onCategoryChange('All')}
          />
          <CategoryButton
            label={t('sidebar.uncategorized')}
            count={uncategorizedCount}
            isActive={activeCategory === UNCATEGORIZED_FILTER}
            icon="uncategorized"
            onClick={() => onCategoryChange(UNCATEGORIZED_FILTER)}
          />
          {customCategories.map((cat, index) => (
            <div
              key={cat.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={`${dragOverIndex === index && dragIndex !== index ? 'border-t-2 border-orange-500/50 -mt-px' : ''} ${dragIndex === index ? 'opacity-50' : ''}`}
            >
              <CategoryButton
                label={cat.name}
                count={categoryCounts.get(cat.id) || 0}
                isActive={activeCategory === cat.id}
                color={cat.color}
                onClick={() => onCategoryChange(cat.id)}
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => setTechStackOpen(!techStackOpen)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider hover:text-stone-300 transition-colors"
        >
          {t('sidebar.techStack')}
          <ChevronDown size={14} className={`transition-transform ${techStackOpen ? 'rotate-0' : '-rotate-90'}`} />
        </button>
        {techStackOpen && (
          <div className="px-3 space-y-1">
            {typeGroups.filter(g => g.count > 0).map((group) => (
              <div key={group.type}>
                <CategoryButton label={group.type} count={group.count} isActive={activeCategory === group.type} onClick={() => onCategoryChange(group.type)} />
              </div>
            ))}
          </div>
        )}
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

function ProjectHubMark() {
  return (
    <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 shadow-lg shadow-orange-950/30 ring-1 ring-orange-200/20">
      <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true">
        <path d="M10 11h12M10 21h12M10 11v10M22 11v10" fill="none" stroke="#fff7ed" strokeWidth="2.75" strokeLinecap="round" />
        <circle cx="10" cy="11" r="3.5" fill="#fff7ed" />
        <circle cx="22" cy="11" r="3.5" fill="#fff7ed" />
        <circle cx="10" cy="21" r="3.5" fill="#fff7ed" />
        <circle cx="22" cy="21" r="3.5" fill="#fff7ed" />
      </svg>
    </div>
  )
}

interface CategoryButtonProps {
  label: string
  count: number
  isActive: boolean
  color?: string
  icon?: 'uncategorized'
  onClick: () => void
}

function CategoryButton({ label, count, isActive, color, icon, onClick }: CategoryButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between
        ${isActive ? 'bg-stone-800 text-stone-100 font-medium' : 'hover:bg-stone-800/50 text-stone-400 hover:text-stone-200'}`}
    >
      <span className="flex items-center gap-3 min-w-0">
        {color
          ? <Tag size={16} style={{ color }} className="shrink-0" />
          : icon === 'uncategorized'
            ? <CircleDashed size={16} className="shrink-0" />
            : <LayoutGrid size={16} className="shrink-0" />}
        <span className="truncate">{label}</span>
      </span>
      <span className="text-xs text-stone-500 shrink-0">{count}</span>
    </button>
  )
}

import { useI18n } from '../i18n'
import { EmptyState } from './EmptyState'
import { SkeletonLoader } from './SkeletonLoader'
import { ProjectGrid } from './ProjectGrid'
import { useRef, useEffect, useState } from 'react'
import { CheckSquare, Tags, X } from 'lucide-react'
import type { Project, ProjectDetail, IdeInfo, CategoryDefinition } from '../types'
import { UNCATEGORIZED_FILTER } from '../utils/projectCategories'

interface MainContentProps {
  activeCategory: string
  filteredProjects: ProjectDetail[]
  loading: boolean
  scanning: boolean
  error: string | null
  noScanDirs: boolean
  isEmpty: boolean
  noResults: boolean
  ides: IdeInfo[]
  preferredIde: string | null
  customCategories: CategoryDefinition[]
  onOpenAction: (projectId: string, action: string) => void
  onProjectClick: (project: ProjectDetail) => void
  onBulkCategoryChange: (projectIds: string[], categoryId: string | null) => Promise<Project[]>
  onSettingsOpen: () => void
  actionError: string | null
  onDismissError: () => void
}

export function MainContent({
  activeCategory,
  filteredProjects,
  loading,
  scanning,
  error,
  noScanDirs,
  isEmpty,
  noResults,
  ides,
  preferredIde,
  customCategories,
  onOpenAction,
  onProjectClick,
  onBulkCategoryChange,
  onSettingsOpen,
  actionError,
  onDismissError,
}: MainContentProps) {
  const { t } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [targetCategory, setTargetCategory] = useState(customCategories[0]?.id || '__none__')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)

  // Auto-scroll to top when error appears
  useEffect(() => {
    if (actionError) {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [actionError])

  useEffect(() => {
    setSelectedIds(new Set())
    setBulkMessage(null)
    setBulkError(null)
  }, [activeCategory])

  useEffect(() => {
    const visibleIds = new Set(filteredProjects.map((project) => project.id))
    setSelectedIds((current) => {
      const visibleSelection = new Set([...current].filter((id) => visibleIds.has(id)))
      return visibleSelection.size === current.size ? current : visibleSelection
    })
  }, [filteredProjects])

  useEffect(() => {
    if (targetCategory === '__none__') return
    if (!customCategories.some((category) => category.id === targetCategory)) {
      setTargetCategory(customCategories[0]?.id || '__none__')
    }
  }, [customCategories, targetCategory])

  const allVisibleSelected = filteredProjects.length > 0 && filteredProjects.every((project) => selectedIds.has(project.id))

  function toggleSelection(projectId: string) {
    setBulkMessage(null)
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  function toggleAllVisible() {
    setBulkMessage(null)
    setSelectedIds(allVisibleSelected ? new Set() : new Set(filteredProjects.map((project) => project.id)))
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedIds(new Set())
    setBulkMessage(null)
    setBulkError(null)
  }

  async function applyBulkCategory() {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    setBulkSaving(true)
    setBulkError(null)
    try {
      await onBulkCategoryChange([...selectedIds], targetCategory === '__none__' ? null : targetCategory)
      setSelectedIds(new Set())
      setBulkMessage(t('bulk.updated', { count: String(count) }))
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : t('bulk.failed'))
    } finally {
      setBulkSaving(false)
    }
  }

  return (
    <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 xl:p-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:mb-8 sm:flex-row">
        <div>
          <h1 className="text-2xl font-semibold text-stone-100 flex items-center gap-2">
          {activeCategory === 'All'
            ? t('app.allProjects')
            : activeCategory === UNCATEGORIZED_FILTER
              ? `${t('sidebar.uncategorized')} ${t('app.projectsSuffix')}`
            : (() => {
              const techKey = `tech.${activeCategory}` as never
              const translated = t(techKey)
              const displayName = translated === techKey ? activeCategory : translated
              return `${displayName} ${t('app.projectsSuffix')}`
            })()}
          <span className="text-stone-500 text-lg font-normal">({filteredProjects.length})</span>
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            {filteredProjects.length > 0 ? t('app.manageWorkspace') : t('app.configureDirs')}
          </p>
        </div>
        {!selectionMode && filteredProjects.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectionMode(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-300 hover:border-stone-600 hover:text-stone-100 transition-colors"
          >
            <Tags size={16} /> {t('bulk.start')}
          </button>
        )}
      </div>

      {selectionMode && (
        <div className="sticky top-0 z-20 mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-orange-500/30 bg-stone-900/95 p-3 shadow-xl backdrop-blur" aria-live="polite">
          <span className="flex items-center gap-2 text-sm font-medium text-stone-100">
            <CheckSquare size={16} className="text-orange-400" />
            {t('bulk.selectedCount', { count: String(selectedIds.size) })}
          </span>
          <button type="button" onClick={toggleAllVisible} className="text-sm text-stone-300 hover:text-white">
            {allVisibleSelected ? t('bulk.clear') : t('bulk.selectAll')}
          </button>
          <select
            value={targetCategory}
            onChange={(event) => setTargetCategory(event.target.value)}
            className="min-w-36 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200 focus:border-orange-500 focus:outline-none"
            aria-label={t('bulk.targetCategory')}
          >
            <option value="__none__">{t('detail.uncategorized')}</option>
            {customCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <button
            type="button"
            onClick={applyBulkCategory}
            disabled={selectedIds.size === 0 || bulkSaving}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bulkSaving ? t('bulk.applying') : t('bulk.apply')}
          </button>
          <button type="button" onClick={exitSelectionMode} className="ml-auto rounded-lg p-2 text-stone-400 hover:bg-stone-800 hover:text-white" aria-label={t('bulk.exit')}>
            <X size={16} />
          </button>
          {bulkMessage && <span className="w-full text-xs text-emerald-400">{bulkMessage}</span>}
          {bulkError && <span className="w-full text-xs text-red-400">{bulkError}</span>}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
      )}

      {actionError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex justify-between items-center">
          <span>{actionError}</span>
          <button onClick={onDismissError} className="text-stone-400 hover:text-stone-200">{t('app.dismiss')}</button>
        </div>
      )}

      {loading && !scanning ? (
        <SkeletonLoader count={6} />
      ) : noScanDirs ? (
        <EmptyState type="no-config" onAction={onSettingsOpen} />
      ) : isEmpty ? (
        <EmptyState type="no-projects" />
      ) : noResults ? (
        <EmptyState type="no-results" />
      ) : (
        <ProjectGrid
          projects={filteredProjects}
          ides={ides}
          preferredIde={preferredIde}
          customCategories={customCategories}
          onOpenAction={onOpenAction}
          onProjectClick={onProjectClick}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelection={toggleSelection}
        />
      )}
    </main>
  )
}

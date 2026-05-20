import { useI18n } from '../i18n'
import { EmptyState } from './EmptyState'
import { SkeletonLoader } from './SkeletonLoader'
import { ProjectGrid } from './ProjectGrid'
import { useRef, useEffect } from 'react'
import type { ProjectDetail, TypeGroup, IdeInfo } from '../types'

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
  onOpenAction: (projectId: string, action: string) => void
  onProjectClick: (project: ProjectDetail) => void
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
  onOpenAction,
  onProjectClick,
  onSettingsOpen,
  actionError,
  onDismissError,
}: MainContentProps) {
  const { t } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to top when error appears
  useEffect(() => {
    if (actionError) {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [actionError])

  return (
    <main ref={scrollRef} className="flex-1 overflow-y-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-100 flex items-center gap-2">
          {activeCategory === 'All'
            ? t('app.allProjects')
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
          onOpenAction={onOpenAction}
          onProjectClick={onProjectClick}
        />
      )}
    </main>
  )
}
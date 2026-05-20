import { useState, useMemo, useCallback } from 'react'
import { executeOpenAction } from './api/client'
import { useProjects } from './hooks/useProjects'
import { useConfig } from './hooks/useConfig'
import { Sidebar } from './components/Sidebar'
import { SearchHeader } from './components/SearchHeader'
import { ProjectGrid } from './components/ProjectGrid'
import { ProjectDetailPanel } from './components/ProjectDetail'
import { SettingsPanel } from './components/SettingsPanel'
import { EmptyState } from './components/EmptyState'
import { SkeletonLoader } from './components/SkeletonLoader'
import type { ProjectDetail, TypeGroup } from './types'

export default function App() {
  const { projects, loading, scanning, error, scan } = useProjects()
  const { config, save: saveConfig } = useConfig()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const filteredProjects = useMemo(() => {
    let result = projects
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.path.toLowerCase().includes(q)
      )
    }
    if (activeCategory !== 'All') {
      result = result.filter(
        (p) => p.type === activeCategory || p.tags.includes(activeCategory)
      )
    }
    return result
  }, [projects, searchQuery, activeCategory])

  const typeGroups = useMemo((): TypeGroup[] => {
    const counts = new Map<string, number>()
    for (const p of projects) counts.set(p.type, (counts.get(p.type) || 0) + 1)
    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
  }, [projects])

  const handleOpenAction = useCallback(async (projectId: string, action: 'vscode' | 'terminal' | 'folder') => {
    setActionError(null)
    try {
      await executeOpenAction(projectId, action)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
    }
  }, [])

  const noScanDirs = config && config.scanDirectories.length === 0
  const noResults = !loading && !scanning && projects.length > 0 && filteredProjects.length === 0
  const isEmpty = !loading && !scanning && projects.length === 0

  return (
    <div className="flex h-screen bg-stone-950 text-stone-300 font-sans overflow-hidden">
      <Sidebar
        typeGroups={typeGroups}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <SearchHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onScan={scan}
          scanning={scanning}
          lastScanTime={config?.lastScanTime || null}
          projectCount={projects.length}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-stone-100 flex items-center gap-2">
              {activeCategory === 'All' ? 'All Projects' : `${activeCategory} Projects`}
              <span className="text-stone-500 text-lg font-normal">({filteredProjects.length})</span>
            </h1>
            <p className="text-stone-400 text-sm mt-1">
              {projects.length > 0
                ? 'Manage and explore your local development workspace.'
                : 'Configure scan directories to discover your projects.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
          )}

          {actionError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex justify-between items-center">
              <span>{actionError}</span>
              <button onClick={() => setActionError(null)} className="text-stone-400 hover:text-stone-200">Dismiss</button>
            </div>
          )}

          {loading && !scanning ? (
            <SkeletonLoader count={6} />
          ) : noScanDirs ? (
            <EmptyState type="no-config" onAction={() => setSettingsOpen(true)} />
          ) : isEmpty ? (
            <EmptyState type="no-projects" />
          ) : noResults ? (
            <EmptyState type="no-results" />
          ) : (
            <ProjectGrid
              projects={filteredProjects}
              onOpenAction={handleOpenAction}
              onProjectClick={setSelectedProject}
            />
          )}
        </main>
      </div>

      <ProjectDetailPanel
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onOpenAction={handleOpenAction}
      />

      <SettingsPanel
        open={settingsOpen}
        config={config}
        onClose={() => setSettingsOpen(false)}
        onSave={saveConfig}
      />
    </div>
  )
}

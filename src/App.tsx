import { useState, useMemo, useCallback, useEffect } from 'react'
import { executeOpenAction, updateProjectCategory, fetchIdes } from './api/client'
import { useProjects } from './hooks/useProjects'
import { useConfig } from './hooks/useConfig'
import { Sidebar } from './components/Sidebar'
import { SearchHeader } from './components/SearchHeader'
import { ProjectDetailPanel } from './components/ProjectDetail'
import { SettingsPanel } from './components/SettingsPanel'
import { MainContent } from './components/MainContent'
import { I18nProvider } from './i18n'
import type { ProjectDetail, TypeGroup, IdeInfo } from './types'

export default function App() {
  const { projects, loading, scanning, error, scan } = useProjects()
  const { config, save: saveConfig } = useConfig()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [ides, setIdes] = useState<IdeInfo[]>([])

  useEffect(() => {
    fetchIdes().then(setIdes).catch(() => {})
  }, [])

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
      const isCustomCat = config?.customCategories.some(c => c.id === activeCategory)
      if (isCustomCat) {
        result = result.filter((p) => p.customCategory === activeCategory)
      } else {
        result = result.filter(
          (p) => p.type === activeCategory || p.tags.includes(activeCategory)
        )
      }
    }
    return result
  }, [projects, searchQuery, activeCategory, config])

  const typeGroups = useMemo((): TypeGroup[] => {
    const counts = new Map<string, number>()
    for (const p of projects) counts.set(p.type, (counts.get(p.type) || 0) + 1)
    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
  }, [projects])

  const handleOpenAction = useCallback(async (projectId: string, action: string) => {
    setActionError(null)
    try {
      await executeOpenAction(projectId, action)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
    }
  }, [])

  const onRefresh = useCallback(() => {
    scan()
  }, [scan])

  const handleCategoryChange = useCallback(async (projectId: string, categoryId: string | null) => {
    try {
      await updateProjectCategory(projectId, categoryId)
      onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update category')
    }
  }, [onRefresh])

  const noScanDirs = config && config.scanDirectories.length === 0
  const noResults = !loading && !scanning && projects.length > 0 && filteredProjects.length === 0
  const isEmpty = !loading && !scanning && projects.length === 0

  return (
    <I18nProvider initialLang={(config?.language as 'en' | 'zh') || 'en'}>
      <div className="flex h-screen bg-stone-950 text-stone-300 font-sans overflow-hidden">
        <Sidebar
          typeGroups={typeGroups}
          customCategories={config?.customCategories || []}
          projects={projects}
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

          <MainContent
            activeCategory={activeCategory}
            filteredProjects={filteredProjects}
            loading={loading}
            scanning={scanning}
            error={error}
            noScanDirs={!!noScanDirs}
            isEmpty={isEmpty}
            noResults={noResults}
            ides={ides}
            preferredIde={config?.preferredIde || null}
            onOpenAction={handleOpenAction}
            onProjectClick={setSelectedProject}
            onSettingsOpen={() => setSettingsOpen(true)}
            actionError={actionError}
            onDismissError={() => setActionError(null)}
          />
        </div>

        <ProjectDetailPanel
          project={selectedProject}
          customCategories={config?.customCategories || []}
          ides={ides}
          preferredIde={config?.preferredIde || null}
          onClose={() => setSelectedProject(null)}
          onOpenAction={handleOpenAction}
          onCategoryChange={handleCategoryChange}
          onRefresh={onRefresh}
        />

        <SettingsPanel
          open={settingsOpen}
          config={config}
          onClose={() => setSettingsOpen(false)}
          onSave={saveConfig}
        />
      </div>
    </I18nProvider>
  )
}
import { useState, useMemo, useCallback, useEffect } from 'react'
import { executeOpenAction, fetchIdes } from './api/client'
import { useProjects } from './hooks/useProjects'
import { useConfig } from './hooks/useConfig'
import { Sidebar } from './components/Sidebar'
import { SearchHeader } from './components/SearchHeader'
import { ProjectDetailPanel } from './components/ProjectDetail'
import { SettingsPanel } from './components/SettingsPanel'
import { MainContent } from './components/MainContent'
import { I18nProvider } from './i18n'
import type { ProjectDetail, TypeGroup, CategoryDefinition, IdeInfo } from './types'
import { isProjectUncategorized, UNCATEGORIZED_FILTER } from './utils/projectCategories'

export default function App() {
  const { projects, loading, scanning, error, lastScanResult, scan, updateCategories } = useProjects()
  const { config, save: saveConfig, refresh: refreshConfig } = useConfig()

  const handleScan = useCallback(async () => {
    await scan()
    await refreshConfig()
  }, [scan, refreshConfig])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
      const validCategoryIds = new Set(config?.customCategories.map((category) => category.id) || [])
      const isCustomCat = validCategoryIds.has(activeCategory)
      if (activeCategory === UNCATEGORIZED_FILTER) {
        result = result.filter((project) => isProjectUncategorized(project, validCategoryIds))
      } else if (isCustomCat) {
        result = result.filter((p) => p.customCategory === activeCategory)
      } else {
        result = result.filter(
          (p) => p.type === activeCategory || p.tags.includes(activeCategory)
        )
      }
    }
    return [...result].sort((a, b) => {
      const timeCmp = b.lastModified.localeCompare(a.lastModified)
      if (timeCmp !== 0) return timeCmp
      return a.name.localeCompare(b.name)
    })
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

  const handleCategoryChange = useCallback(async (projectId: string, categoryId: string | null) => {
    setActionError(null)
    try {
      await updateCategories([projectId], categoryId)
      setSelectedProject(prev => prev?.id === projectId ? { ...prev, customCategory: categoryId } : prev)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update category')
    }
  }, [updateCategories])

  const handleReorderCategories = useCallback(async (categories: CategoryDefinition[]) => {
    await saveConfig({ customCategories: categories })
  }, [saveConfig])

  const handleSidebarCategoryChange = useCallback((category: string) => {
    setActiveCategory(category)
    setSidebarOpen(false)
  }, [])

  const handleSettingsOpen = useCallback(() => {
    setSidebarOpen(false)
    setSettingsOpen(true)
  }, [])

  const noScanDirs = config && config.scanDirectories.length === 0
  const noResults = !loading && !scanning && projects.length > 0 && filteredProjects.length === 0
  const isEmpty = !loading && !scanning && projects.length === 0

  return (
    <I18nProvider initialLang={(config?.language as 'en' | 'zh') || 'en'}>
      <div className="flex h-screen bg-stone-950 text-stone-300 font-sans overflow-hidden">
        <div className="hidden lg:flex shrink-0">
          <Sidebar
            typeGroups={typeGroups}
            customCategories={config?.customCategories || []}
            projects={projects}
            activeCategory={activeCategory}
            onCategoryChange={handleSidebarCategoryChange}
            onSettingsClick={handleSettingsOpen}
            onReorderCategories={handleReorderCategories}
          />
        </div>

        {sidebarOpen && (
          <>
            <button
              type="button"
              aria-label="Close navigation"
              className="fixed inset-0 z-40 bg-black/70 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 flex lg:hidden">
              <Sidebar
                typeGroups={typeGroups}
                customCategories={config?.customCategories || []}
                projects={projects}
                activeCategory={activeCategory}
                onCategoryChange={handleSidebarCategoryChange}
                onSettingsClick={handleSettingsOpen}
                onReorderCategories={handleReorderCategories}
              />
            </div>
          </>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <SearchHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onScan={handleScan}
            scanning={scanning}
            lastScanTime={config?.lastScanTime || null}
            projectCount={projects.length}
            scanResult={lastScanResult}
            onMenuClick={() => setSidebarOpen(true)}
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
            customCategories={config?.customCategories || []}
            onOpenAction={handleOpenAction}
            onProjectClick={setSelectedProject}
            onBulkCategoryChange={updateCategories}
            onSettingsOpen={handleSettingsOpen}
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

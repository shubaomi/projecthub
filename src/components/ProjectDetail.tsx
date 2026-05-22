import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Code2, Terminal, Folder, Tag, ChevronDown, Check } from 'lucide-react'
import type { ProjectDetail as ProjectDetailType, CategoryDefinition, IdeInfo } from '../types'
import { GitStatusBadge } from './GitStatusBadge'
import { useI18n } from '../i18n'
import { fetchProject } from '../api/client'

interface ProjectDetailProps {
  project: ProjectDetailType | null
  customCategories: CategoryDefinition[]
  ides: IdeInfo[]
  preferredIde: string | null
  onClose: () => void
  onOpenAction: (projectId: string, action: string) => void
  onCategoryChange: (projectId: string, categoryId: string | null) => void
  onRefresh: () => void
}

export function ProjectDetailPanel({ project, customCategories, ides, preferredIde, onClose, onOpenAction, onCategoryChange, onRefresh }: ProjectDetailProps) {
  const { t } = useI18n()
  const [showIdeMenu, setShowIdeMenu] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [fullProject, setFullProject] = useState<ProjectDetailType | null>(null)
  const [readmeLoading, setReadmeLoading] = useState(false)
  const selectedIde = ides.find(i => i.id === (preferredIde || 'vscode')) || ides[0]

  useEffect(() => {
    if (!project) {
      setFullProject(null)
      return
    }
    setReadmeLoading(true)
    fetchProject(project.id)
      .then(p => setFullProject(p))
      .catch(() => setFullProject(null))
      .finally(() => setReadmeLoading(false))
  }, [project?.id])

  const readmeContent = fullProject?.readme || project?.readme || null
  const currentCategory = customCategories.find(c => c.id === project?.customCategory)
  return (
    <AnimatePresence>
      {project && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40" onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-[500px] bg-stone-950 border-l border-stone-800 z-50 overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-stone-100">{project.name}</h2>
                <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg transition-colors text-stone-400 hover:text-stone-200">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <DetailSection label={t('detail.path')}>
                  <p className="font-mono text-sm text-stone-300 break-all">{project.path}</p>
                </DetailSection>

                <DetailSection label={t('detail.type')}>
                  <p className="text-stone-300">{project.type}</p>
                </DetailSection>

                {project.tags.length > 0 && (
                  <DetailSection label={t('detail.tags')}>
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-stone-800 text-stone-300 rounded-md text-xs border border-stone-700/50">{tag}</span>
                      ))}
                    </div>
                  </DetailSection>
                )}

                {customCategories.length > 0 && (
                  <DetailSection label={t('detail.category')}>
                    <div className="relative" tabIndex={0} onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowCategoryMenu(false)
                    }}>
                      <button
                        onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                        className="flex items-center gap-2 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 hover:border-stone-500 transition-colors w-full justify-between"
                      >
                        <span className="flex items-center gap-2">
                          {currentCategory ? (
                            <><Tag size={14} style={{ color: currentCategory.color }} /> {currentCategory.name}</>
                          ) : (
                            <span className="text-stone-400">{t('detail.uncategorized')}</span>
                          )}
                        </span>
                        <ChevronDown size={14} className={showCategoryMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
                      </button>
                      {showCategoryMenu && (
                        <div className="absolute top-full left-0 mt-1 bg-stone-800 border border-stone-700 rounded-lg shadow-xl z-10 w-full">
                          <button
                            onClick={() => { onCategoryChange(project.id, null); setShowCategoryMenu(false) }}
                            className="w-full text-left px-3 py-2 text-sm text-stone-200 hover:bg-stone-700 first:rounded-t-lg flex items-center gap-2"
                          >
                            {!project.customCategory ? <Check size={14} className="text-stone-300 shrink-0" /> : <span className="w-[14px] shrink-0" />}
                            {t('detail.uncategorized')}
                          </button>
                          {customCategories.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => { onCategoryChange(project.id, cat.id); setShowCategoryMenu(false) }}
                              className="w-full text-left px-3 py-2 text-sm text-stone-200 hover:bg-stone-700 last:rounded-b-lg flex items-center gap-2"
                            >
                              {project.customCategory === cat.id ? (
                                <Check size={14} className="text-stone-300 shrink-0" />
                              ) : (
                                <span className="w-[14px] shrink-0" />
                              )}
                              <Tag size={14} style={{ color: cat.color }} />
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </DetailSection>
                )}

                <DetailSection label={t('detail.gitStatus')}>
                  <GitStatusBadge git={project.git} />
                  {project.git?.isRepo && (
                    <div className="mt-2 text-xs text-stone-400 space-y-1">
                      {project.git.allBranches.length > 1 && (
                        <div>
                          <span className="text-stone-500">{t('detail.branches')}</span>
                          {project.git.allBranches.map((b) => (
                            <div key={b} className="flex items-start gap-1.5 ml-2">
                              <span className="text-stone-600 mt-0.5">•</span>
                              <span className="text-stone-300">{b}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {project.git.modified.length > 0 && (
                        <div>
                          <span className="text-stone-500">{t('detail.modified')}</span>
                          {project.git.modified.map((f) => (
                            <div key={f} className="flex items-start gap-1.5 ml-2">
                              <span className="text-stone-600 mt-0.5">•</span>
                              <span className="text-stone-300">{f}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {project.git.added.length > 0 && (
                        <div>
                          <span className="text-stone-500">{t('detail.added')}</span>
                          {project.git.added.map((f) => (
                            <div key={f} className="flex items-start gap-1.5 ml-2">
                              <span className="text-stone-600 mt-0.5">•</span>
                              <span className="text-stone-300">{f}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {project.git.untracked.length > 0 && (
                        <div>
                          <span className="text-stone-500">{t('detail.untracked')}</span>
                          {project.git.untracked.map((f) => (
                            <div key={f} className="flex items-start gap-1.5 ml-2">
                              <span className="text-stone-600 mt-0.5">•</span>
                              <span className="text-stone-300">{f}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {project.git.ahead > 0 && <p className="text-amber-400">{t('detail.ahead', { count: String(project.git.ahead) })}</p>}
                      {project.git.behind > 0 && <p className="text-amber-400">{t('detail.behind', { count: String(project.git.behind) })}</p>}
                    </div>
                  )}
                </DetailSection>

                {readmeLoading ? (
                  <DetailSection label={t('detail.readme')}>
                    <div className="bg-stone-900 rounded-lg p-4 text-sm text-stone-500">Loading...</div>
                  </DetailSection>
                ) : readmeContent ? (
                  <DetailSection label={t('detail.readme')}>
                    <div className="bg-stone-900 rounded-lg p-4 text-sm text-stone-300 whitespace-pre-wrap font-mono max-h-[60vh] overflow-y-auto">
                      {readmeContent}
                    </div>
                  </DetailSection>
                ) : null}

                <div className="flex gap-3 pt-4">
                  {(['terminal', 'folder'] as const).map((action) => {
                    const Icon = action === 'terminal' ? Terminal : Folder
                    const label = action === 'terminal' ? t('detail.openTerminal') : t('detail.openFolder')
                    return (
                      <button
                        key={action}
                        onClick={() => { onOpenAction(project.id, action); onClose() }}
                        className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-200 px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        <Icon size={16} /> {label}
                      </button>
                    )
                  })}
                  {ides.length > 0 ? (
                    <div className="relative" tabIndex={0} onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowIdeMenu(false)
                    }}>
                      <button
                        onClick={() => setShowIdeMenu(!showIdeMenu)}
                        className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-200 px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        <Code2 size={16} /> {selectedIde?.name || 'IDE'} <ChevronDown size={14} />
                      </button>
                      {showIdeMenu && (
                        <div className="absolute bottom-full left-0 mb-1 bg-stone-800 border border-stone-700 rounded-lg shadow-xl z-10 min-w-[160px]">
                          {ides.map((ide) => (
                            <button
                              key={ide.id}
                              onClick={() => { onOpenAction(project.id, ide.command); setShowIdeMenu(false); onClose() }}
                              className="w-full text-left px-4 py-2 text-sm text-stone-200 hover:bg-stone-700 first:rounded-t-lg last:rounded-b-lg"
                            >
                              {ide.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => { onOpenAction(project.id, 'code'); onClose() }}
                      className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-200 px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      <Code2 size={16} /> VS Code
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">{label}</p>
      {children}
    </div>
  )
}

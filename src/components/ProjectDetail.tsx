import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Code2, Terminal, Folder } from 'lucide-react'
import type { ProjectDetail as ProjectDetailType } from '../types'
import { GitStatusBadge } from './GitStatusBadge'

interface ProjectDetailProps {
  project: ProjectDetailType | null
  onClose: () => void
  onOpenAction: (projectId: string, action: 'vscode' | 'terminal' | 'folder') => void
}

export function ProjectDetailPanel({ project, onClose, onOpenAction }: ProjectDetailProps) {
  return (
    <AnimatePresence>
      {project && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40" onClick={onClose}
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
                <DetailSection label="Path">
                  <p className="font-mono text-sm text-stone-300 break-all">{project.path}</p>
                </DetailSection>

                <DetailSection label="Type">
                  <p className="text-stone-300">{project.type}</p>
                </DetailSection>

                {project.tags.length > 0 && (
                  <DetailSection label="Tags">
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-stone-800 text-stone-300 rounded-md text-xs border border-stone-700/50">{tag}</span>
                      ))}
                    </div>
                  </DetailSection>
                )}

                <DetailSection label="Git Status">
                  <GitStatusBadge git={project.git} />
                  {project.git.isRepo && (
                    <div className="mt-2 text-xs text-stone-400 space-y-1">
                      {project.git.modified.length > 0 && <p>Modified: {project.git.modified.join(', ')}</p>}
                      {project.git.added.length > 0 && <p>Added: {project.git.added.join(', ')}</p>}
                      {project.git.untracked.length > 0 && <p>Untracked: {project.git.untracked.join(', ')}</p>}
                      {project.git.ahead > 0 && <p className="text-amber-400">{project.git.ahead} commits ahead of remote</p>}
                      {project.git.behind > 0 && <p className="text-amber-400">{project.git.behind} commits behind remote</p>}
                    </div>
                  )}
                </DetailSection>

                {project.readme && (
                  <DetailSection label="README">
                    <div className="bg-stone-900 rounded-lg p-4 text-sm text-stone-300 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                      {project.readme}
                    </div>
                  </DetailSection>
                )}

                <div className="flex gap-3 pt-4">
                  {(['vscode', 'terminal', 'folder'] as const).map((action) => {
                    const Icon = action === 'vscode' ? Code2 : action === 'terminal' ? Terminal : Folder
                    const label = action === 'vscode' ? 'VS Code' : action === 'terminal' ? 'Terminal' : 'Folder'
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

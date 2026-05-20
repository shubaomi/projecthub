import React from 'react'
import { motion } from 'motion/react'
import {
  Code2, Folder, Terminal, MoreVertical, Globe, Server,
} from 'lucide-react'
import type { ProjectDetail } from '../types'
import { GitStatusBadge } from './GitStatusBadge'
import { ReadmeExcerpt } from './ReadmeExcerpt'

export interface ProjectCardProps {
  project: ProjectDetail
  onOpen: (action: 'vscode' | 'terminal' | 'folder') => void
  onClick: () => void
}

type IconComponent = React.ComponentType<{ size?: number; className?: string }>

const ICON_MAP: Record<string, IconComponent> = {
  React: Code2, 'Next.js': Globe, Vue: Code2, Svelte: Code2,
  'Node.js': Server, Go: Code2, Rust: Code2, Python: Code2,
  '.NET': Code2, Java: Code2, Unknown: Folder,
}

const COLOR_MAP: Record<string, { color: string; bg: string }> = {
  React: { color: 'text-blue-400', bg: 'bg-blue-400/10' },
  'Next.js': { color: 'text-slate-300', bg: 'bg-slate-300/10' },
  Vue: { color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  Svelte: { color: 'text-orange-400', bg: 'bg-orange-400/10' },
  'Node.js': { color: 'text-green-400', bg: 'bg-green-400/10' },
  Go: { color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  Rust: { color: 'text-amber-400', bg: 'bg-amber-400/10' },
  Python: { color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  '.NET': { color: 'text-purple-400', bg: 'bg-purple-400/10' },
  Java: { color: 'text-red-400', bg: 'bg-red-400/10' },
  Unknown: { color: 'text-stone-400', bg: 'bg-stone-400/10' },
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export function ProjectCard({ project, onOpen, onClick }: ProjectCardProps) {
  const Icon = ICON_MAP[project.type] || Folder
  const colors = COLOR_MAP[project.type] || COLOR_MAP.Unknown
  const formattedTime = project.lastModified ? formatRelativeTime(project.lastModified) : ''

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-stone-900/50 border border-stone-800 rounded-2xl p-5 hover:border-stone-700 transition-colors group flex flex-col cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${colors.bg}`}>
          <Icon size={24} className={colors.color} />
        </div>
        <button className="text-stone-600 hover:text-stone-300 transition-colors p-1" onClick={(e) => e.stopPropagation()}>
          <MoreVertical size={18} />
        </button>
      </div>

      <h3 className="text-stone-100 font-medium text-lg mb-1 truncate">{project.name}</h3>

      <div className="font-mono text-xs text-stone-500 mb-1 truncate flex items-center gap-1.5" title={project.path}>
        <Terminal size={12} />
        {project.path}
      </div>

      <GitStatusBadge git={project.git} />
      <ReadmeExcerpt readme={project.readme} />

      <div className="flex flex-wrap gap-2 mb-4">
        {project.tags.map((tag) => (
          <span key={tag} className="px-2 py-1 bg-stone-800 text-stone-300 rounded-md text-xs font-medium border border-stone-700/50">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-stone-800/50 flex items-center justify-between">
        {formattedTime && <span className="text-xs text-stone-500">Updated {formattedTime}</span>}
        <div className="flex gap-2 ml-auto">
          {(['vscode', 'terminal', 'folder'] as const).map((action) => {
            const ActionIcon = action === 'vscode' ? Code2 : action === 'terminal' ? Terminal : Folder
            return (
              <button
                key={action}
                className="bg-stone-800 hover:bg-stone-700 text-stone-200 p-2 rounded-lg transition-colors"
                title={`Open ${action}`}
                onClick={(e) => { e.stopPropagation(); onOpen(action) }}
              >
                <ActionIcon size={16} />
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

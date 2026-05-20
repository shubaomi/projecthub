import React, { useState } from 'react'
import { motion } from 'motion/react'
import {
  Code2, Folder, Terminal, MoreVertical, Globe, Server, ChevronDown, Tag,
} from 'lucide-react'
import type { ProjectDetail, IdeInfo, CategoryDefinition } from '../types'
import { GitStatusBadge } from './GitStatusBadge'
import { ReadmeExcerpt } from './ReadmeExcerpt'
import { useI18n } from '../i18n'

export interface ProjectCardProps {
  project: ProjectDetail
  ides: IdeInfo[]
  preferredIde: string | null
  customCategories: CategoryDefinition[]
  onOpen: (action: string) => void
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

function formatRelativeTime(isoString: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return t('time.justNow')
  if (minutes < 60) return t('time.minutesAgo', { count: String(minutes) })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('time.hoursAgo', { count: String(hours) })
  const days = Math.floor(hours / 24)
  if (days < 7) return t('time.daysAgo', { count: String(days) })
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return t('time.weeksAgo', { count: String(weeks) })
  return t('time.monthsAgo', { count: String(Math.floor(days / 30)) })
}

export function ProjectCard({ project, ides, preferredIde, customCategories, onOpen, onClick }: ProjectCardProps) {
  const { t } = useI18n()
  const Icon = ICON_MAP[project.type] || Folder
  const colors = COLOR_MAP[project.type] || COLOR_MAP.Unknown
  const formattedTime = project.lastModified ? formatRelativeTime(project.lastModified, t) : ''
  const [showIdeMenu, setShowIdeMenu] = useState(false)
  const selectedIde = ides.find(i => i.id === (preferredIde || 'vscode')) || ides[0]
  const category = customCategories.find(c => c.id === project.customCategory)

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

      <h3 className="text-stone-100 font-medium text-lg truncate">{project.name}</h3>

      {category && (
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border"
            style={{ color: category.color, borderColor: category.color + '40', backgroundColor: category.color + '18' }}
          >
            <Tag size={11} />
            {category.name}
          </span>
        </div>
      )}

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
        {formattedTime && <span className="text-xs text-stone-500">{t('card.updated', { time: formattedTime })}</span>}
        <div className="flex gap-2 ml-auto">
          <button
            className="bg-stone-800 hover:bg-stone-700 text-stone-200 p-2 rounded-lg transition-colors"
            title="Open Terminal"
            onClick={(e) => { e.stopPropagation(); onOpen('terminal') }}
          >
            <Terminal size={16} />
          </button>
          <button
            className="bg-stone-800 hover:bg-stone-700 text-stone-200 p-2 rounded-lg transition-colors"
            title="Open Folder"
            onClick={(e) => { e.stopPropagation(); onOpen('folder') }}
          >
            <Folder size={16} />
          </button>
          {ides.length > 0 ? (
            <div className="relative" tabIndex={0} onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowIdeMenu(false)
            }}>
              <button
                className="bg-stone-800 hover:bg-stone-700 text-stone-200 p-2 rounded-lg transition-colors flex items-center gap-1"
                title={`Open in ${selectedIde?.name || 'IDE'}`}
                onClick={(e) => { e.stopPropagation(); setShowIdeMenu(!showIdeMenu) }}
              >
                <Code2 size={16} />
                <ChevronDown size={12} />
              </button>
              {showIdeMenu && (
                <div className="absolute bottom-full right-0 mb-1 bg-stone-800 border border-stone-700 rounded-lg shadow-xl z-10 min-w-[120px]">
                  {ides.map((ide) => (
                    <button
                      key={ide.id}
                      className="w-full text-left px-3 py-2 text-sm text-stone-200 hover:bg-stone-700 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2"
                      onClick={(e) => { e.stopPropagation(); onOpen(ide.command); setShowIdeMenu(false) }}
                    >
                      <Code2 size={14} /> {ide.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              className="bg-stone-800 hover:bg-stone-700 text-stone-200 p-2 rounded-lg transition-colors"
              title="Open VS Code"
              onClick={(e) => { e.stopPropagation(); onOpen('code') }}
            >
              <Code2 size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

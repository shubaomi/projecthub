import { GitBranch } from 'lucide-react'
import type { GitStatus } from '../types'

interface GitStatusBadgeProps {
  git: GitStatus
}

export function GitStatusBadge({ git }: GitStatusBadgeProps) {
  if (!git.isRepo) return null

  const changeCount = git.modified.length + git.added.length + git.deleted.length + git.untracked.length
  const hasChanges = changeCount > 0
  const hasRemote = git.ahead > 0 || git.behind > 0

  return (
    <div
      className="flex items-center gap-1.5 text-xs"
      title={hasChanges ? `M:${git.modified.length} A:${git.added.length} D:${git.deleted.length} ??:${git.untracked.length}` : 'Clean working tree'}
    >
      <GitBranch size={12} className={hasChanges ? 'text-amber-400' : 'text-emerald-400'} />
      <span className="text-stone-400">{git.branch}</span>
      {hasChanges && <span className="text-amber-400 font-medium">{changeCount}</span>}
      {hasRemote && (
        <span className="text-stone-500">
          {git.ahead > 0 && `↑${git.ahead}`}
          {git.behind > 0 && `↓${git.behind}`}
        </span>
      )}
    </div>
  )
}

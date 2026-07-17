import type { ProjectDetail, IdeInfo, CategoryDefinition } from '../types'
import { ProjectCard } from './ProjectCard'

interface ProjectGridProps {
  projects: ProjectDetail[]
  ides: IdeInfo[]
  preferredIde: string | null
  customCategories: CategoryDefinition[]
  onOpenAction: (projectId: string, action: string) => void
  onProjectClick: (project: ProjectDetail) => void
  selectionMode: boolean
  selectedIds: ReadonlySet<string>
  onToggleSelection: (projectId: string) => void
}

export function ProjectGrid({ projects, ides, preferredIde, customCategories, onOpenAction, onProjectClick, selectionMode, selectedIds, onToggleSelection }: ProjectGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
      {projects.map((project) => (
        <div key={project.id} className="contents">
          <ProjectCard
            project={project}
            ides={ides}
            preferredIde={preferredIde}
            customCategories={customCategories}
            onOpen={(action) => onOpenAction(project.id, action)}
            onClick={() => onProjectClick(project)}
            selectionMode={selectionMode}
            selected={selectedIds.has(project.id)}
            onToggleSelection={() => onToggleSelection(project.id)}
          />
        </div>
      ))}
    </div>
  )
}

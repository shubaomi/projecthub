import { motion, AnimatePresence } from 'motion/react'
import type { ProjectDetail, IdeInfo, CategoryDefinition } from '../types'
import { ProjectCard } from './ProjectCard'

interface ProjectGridProps {
  projects: ProjectDetail[]
  ides: IdeInfo[]
  preferredIde: string | null
  customCategories: CategoryDefinition[]
  onOpenAction: (projectId: string, action: string) => void
  onProjectClick: (project: ProjectDetail) => void
}

export function ProjectGrid({ projects, ides, preferredIde, customCategories, onOpenAction, onProjectClick }: ProjectGridProps) {
  return (
    <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <AnimatePresence>
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            ides={ides}
            preferredIde={preferredIde}
            customCategories={customCategories}
            onOpen={(action) => onOpenAction(project.id, action)}
            onClick={() => onProjectClick(project)}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

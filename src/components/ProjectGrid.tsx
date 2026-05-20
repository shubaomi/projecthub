import { motion, AnimatePresence } from 'motion/react'
import type { ProjectDetail } from '../types'
import { ProjectCard } from './ProjectCard'

interface ProjectGridProps {
  projects: ProjectDetail[]
  onOpenAction: (projectId: string, action: 'vscode' | 'terminal' | 'folder') => void
  onProjectClick: (project: ProjectDetail) => void
}

export function ProjectGrid({ projects, onOpenAction, onProjectClick }: ProjectGridProps) {
  return (
    <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <AnimatePresence>
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onOpen={(action) => onOpenAction(project.id, action)}
            onClick={() => onProjectClick(project)}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

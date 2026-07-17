import type { Project } from '../types.js'

export function applyCategoryUpdates(
  projects: Project[],
  projectIds: string[],
  customCategory: string | null,
): Project[] | null {
  const ids = new Set(projectIds)
  const knownIds = new Set(projects.map((project) => project.id))
  if ([...ids].some((id) => !knownIds.has(id))) return null

  return projects.map((project) => (
    ids.has(project.id) ? { ...project, customCategory } : project
  ))
}

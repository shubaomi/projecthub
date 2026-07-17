import type { Project, ProjectDetail } from '../types.js'

export const UNCATEGORIZED_FILTER = '__uncategorized__'

export function isProjectUncategorized(
  project: Pick<Project, 'customCategory'>,
  validCategoryIds: ReadonlySet<string>,
): boolean {
  return !project.customCategory || !validCategoryIds.has(project.customCategory)
}

export function patchProjectCategories(
  projects: ProjectDetail[],
  projectIds: string[],
  customCategory: string | null,
): ProjectDetail[] {
  const ids = new Set(projectIds)
  return projects.map((project) => (
    ids.has(project.id) ? { ...project, customCategory } : project
  ))
}

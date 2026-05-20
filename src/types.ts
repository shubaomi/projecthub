// src/types.ts

export interface GitStatus {
  branch: string
  allBranches: string[]
  ahead: number
  behind: number
  modified: string[]
  added: string[]
  deleted: string[]
  untracked: string[]
  isRepo: boolean
}

export interface Project {
  id: string
  name: string
  path: string
  type: string
  projectFile: string
  tags: string[]
  customCategory: string | null
  firstSeen: string
  lastScanned: string
}

export interface ProjectDetail extends Project {
  git: GitStatus
  readme: string | null
  lastModified: string
}

export interface CategoryDefinition {
  id: string
  name: string
  color: string
}

export interface AppConfig {
  scanDirectories: string[]
  scanDepth: number
  excludePatterns: string[]
  lastScanTime: string | null
  customCategories: CategoryDefinition[]
  preferredIde: string | null
  language: string
}

export interface ScanResult {
  found: number
  added: number
  removed: number
  total: number
  duration: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export type OpenAction = 'vscode' | 'terminal' | 'folder' | string

export interface IdeInfo {
  id: string
  name: string
  command: string
  detected: boolean
}

export interface TypeGroup {
  type: string
  count: number
}

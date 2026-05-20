// server/types.ts

export interface Project {
  id: string
  name: string
  path: string
  type: string
  projectFile: string
  tags: string[]
  firstSeen: string
  lastScanned: string
}

export interface ProjectList {
  projects: Project[]
}

export interface GitStatus {
  branch: string
  ahead: number
  behind: number
  modified: string[]
  added: string[]
  deleted: string[]
  untracked: string[]
  isRepo: boolean
}

export interface ProjectDetail extends Project {
  git: GitStatus
  readme: string | null
  lastModified: string
}

export interface AppConfig {
  scanDirectories: string[]
  scanDepth: number
  excludePatterns: string[]
  lastScanTime: string | null
}

export type OpenAction = 'vscode' | 'terminal' | 'folder'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface ScanResult {
  found: number
  added: number
  removed: number
  total: number
  duration: number
}

export const DEFAULT_CONFIG: AppConfig = {
  scanDirectories: [],
  scanDepth: 3,
  excludePatterns: ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'target'],
  lastScanTime: null,
}

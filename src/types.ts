// src/types.ts

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

export type OpenAction = 'vscode' | 'terminal' | 'folder'

export interface TypeGroup {
  type: string
  count: number
}

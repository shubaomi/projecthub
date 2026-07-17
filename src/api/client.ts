// src/api/client.ts
import type { ApiResponse, ProjectDetail, AppConfig, ScanResult, Project, IdeInfo, GitStatus } from '../types'

const BASE_URL = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json: ApiResponse<T> = await res.json()
  if (!json.success) throw new Error(json.error || 'Unknown API error')
  return json.data as T
}

export function fetchProjects(): Promise<ProjectDetail[]> {
  return request<ProjectDetail[]>('/projects')
}

export function fetchProject(id: string): Promise<ProjectDetail> {
  return request<ProjectDetail>(`/projects/${encodeURIComponent(id)}`)
}

export function fetchProjectGit(id: string): Promise<GitStatus> {
  return request<GitStatus>(`/projects/${encodeURIComponent(id)}/git`)
}

export function triggerScan(): Promise<ScanResult> {
  return request<ScanResult>('/scan', { method: 'POST', body: '{}' })
}

export function fetchConfig(): Promise<AppConfig> {
  return request<AppConfig>('/config')
}

export function updateConfig(config: Partial<AppConfig>): Promise<AppConfig> {
  return request<AppConfig>('/config', { method: 'PUT', body: JSON.stringify(config) })
}

export function updateProjectCategory(projectId: string, customCategory: string | null): Promise<Project> {
  return request<Project>(`/projects/${encodeURIComponent(projectId)}/category`, {
    method: 'PATCH',
    body: JSON.stringify({ customCategory }),
  })
}

export function updateProjectCategories(projectIds: string[], customCategory: string | null): Promise<Project[]> {
  return request<Project[]>('/projects/categories', {
    method: 'PATCH',
    body: JSON.stringify({ projectIds, customCategory }),
  })
}

export function executeOpenAction(projectId: string, action: string): Promise<{ message: string }> {
  return request<{ message: string }>('/open', {
    method: 'POST',
    body: JSON.stringify({ projectId, action }),
  })
}

export function fetchIdes(): Promise<IdeInfo[]> {
  return request<IdeInfo[]>('/ides')
}

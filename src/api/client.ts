// src/api/client.ts
import type { ApiResponse, ProjectDetail, AppConfig, ScanResult } from '../types'

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

export function fetchProjects(params?: { search?: string; type?: string; tag?: string }): Promise<ProjectDetail[]> {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set('search', params.search)
  if (params?.type) searchParams.set('type', params.type)
  if (params?.tag) searchParams.set('tag', params.tag)
  const qs = searchParams.toString()
  return request<ProjectDetail[]>(`/projects${qs ? `?${qs}` : ''}`)
}

export function fetchProject(id: string): Promise<ProjectDetail> {
  return request<ProjectDetail>(`/projects/${encodeURIComponent(id)}`)
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

export function executeOpenAction(projectId: string, action: string): Promise<{ message: string }> {
  return request<{ message: string }>('/open', {
    method: 'POST',
    body: JSON.stringify({ projectId, action }),
  })
}

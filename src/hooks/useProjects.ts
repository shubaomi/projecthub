// src/hooks/useProjects.ts
import { useState, useCallback, useEffect, useRef } from 'react'
import type { Project, ProjectDetail, GitStatus, ScanResult } from '../types'
import { fetchProjects, fetchProjectGit, triggerScan, updateProjectCategories } from '../api/client'
import { patchProjectCategories } from '../utils/projectCategories'

interface UseProjectsReturn {
  projects: ProjectDetail[]
  loading: boolean
  scanning: boolean
  error: string | null
  lastScanResult: ScanResult | null
  scan: () => Promise<ScanResult>
  refresh: () => Promise<void>
  updateCategories: (projectIds: string[], customCategory: string | null) => Promise<Project[]>
}

async function pMapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return results
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<ProjectDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null)
  const refreshGeneration = useRef(0)
  const initialLoadStarted = useRef(false)

  const refresh = useCallback(async () => {
    const generation = ++refreshGeneration.current
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProjects()
      if (generation !== refreshGeneration.current) return
      const withNullGit = data.map(p => ({ ...p, git: null as GitStatus | null }))
      setProjects(withNullGit)
      setLoading(false)

      // Git status is progressive and never blocks the project list.
      void pMapLimit(withNullGit, 8, async (p) => {
        try {
          const git = await fetchProjectGit(p.id)
          if (generation !== refreshGeneration.current) return
          setProjects(prev => prev.map(existing => existing.id === p.id ? { ...existing, git } : existing))
        } catch {
          // Non-fatal: leave git as null if fetch fails
        }
      })
    } catch (err) {
      if (generation === refreshGeneration.current) {
        setError(err instanceof Error ? err.message : 'Failed to load projects')
      }
    } finally {
      if (generation === refreshGeneration.current) setLoading(false)
    }
  }, [])

  const scan = useCallback(async () => {
    setScanning(true)
    setError(null)
    setLastScanResult(null)
    try {
      const result = await triggerScan()
      await refresh()
      setLastScanResult(result)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
      throw err
    } finally {
      setScanning(false)
    }
  }, [refresh])

  const updateCategories = useCallback(async (projectIds: string[], customCategory: string | null) => {
    const updated = await updateProjectCategories(projectIds, customCategory)
    setProjects((current) => patchProjectCategories(current, projectIds, customCategory))
    return updated
  }, [])

  useEffect(() => {
    if (initialLoadStarted.current) return
    initialLoadStarted.current = true
    void refresh()
  }, [refresh])

  return { projects, loading, scanning, error, lastScanResult, scan, refresh, updateCategories }
}

// src/hooks/useProjects.ts
import { useState, useCallback, useEffect } from 'react'
import type { ProjectDetail, GitStatus, ScanResult } from '../types'
import { fetchProjects, fetchProjectGit, triggerScan } from '../api/client'

interface UseProjectsReturn {
  projects: ProjectDetail[]
  loading: boolean
  scanning: boolean
  error: string | null
  scan: () => Promise<ScanResult>
  refresh: () => Promise<void>
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

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProjects()
      const withNullGit = data.map(p => ({ ...p, git: null as GitStatus | null }))
      setProjects(withNullGit)

      // Lazy-load git status with concurrency limit
      await pMapLimit(withNullGit, 8, async (p) => {
        try {
          const git = await fetchProjectGit(p.id)
          setProjects(prev => prev.map(existing => existing.id === p.id ? { ...existing, git } : existing))
        } catch {
          // Non-fatal: leave git as null if fetch fails
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [])

  const scan = useCallback(async () => {
    setScanning(true)
    setError(null)
    try {
      const result = await triggerScan()
      await refresh()
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
      throw err
    } finally {
      setScanning(false)
    }
  }, [refresh])

  useEffect(() => { refresh() }, [refresh])

  return { projects, loading, scanning, error, scan, refresh }
}

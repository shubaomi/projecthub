// src/hooks/useProjects.ts
import { useState, useCallback, useEffect } from 'react'
import type { ProjectDetail, ScanResult } from '../types'
import { fetchProjects, triggerScan } from '../api/client'

interface UseProjectsReturn {
  projects: ProjectDetail[]
  loading: boolean
  scanning: boolean
  error: string | null
  scan: () => Promise<ScanResult>
  refresh: () => Promise<void>
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
      setProjects(data)
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

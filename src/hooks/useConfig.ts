// src/hooks/useConfig.ts
import { useState, useCallback, useEffect } from 'react'
import type { AppConfig } from '../types'
import { fetchConfig, updateConfig } from '../api/client'

interface UseConfigReturn {
  config: AppConfig | null
  loading: boolean
  error: string | null
  save: (updates: Partial<AppConfig>) => Promise<void>
  refresh: () => Promise<void>
}

export function useConfig(): UseConfigReturn {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchConfig()
      setConfig(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config')
    } finally {
      setLoading(false)
    }
  }, [])

  const save = useCallback(async (updates: Partial<AppConfig>) => {
    setError(null)
    try {
      const updated = await updateConfig(updates)
      setConfig(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config')
      throw err
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { config, loading, error, save, refresh }
}

import { useEffect, useState } from 'react'
import { Search, RefreshCw, X, Menu } from 'lucide-react'
import { useI18n } from '../i18n'
import { LanguageSwitcher } from './LanguageSwitcher'
import type { ScanResult } from '../types'

interface SearchHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onScan: () => void
  scanning: boolean
  lastScanTime: string | null
  projectCount: number
  scanResult: ScanResult | null
  onMenuClick: () => void
}

function formatScanTime(isoString: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return t('time.justNow')
  if (minutes < 60) return t('time.minutesAgo', { count: String(minutes) })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('time.hoursAgo', { count: String(hours) })
  return t('time.daysAgo', { count: String(Math.floor(hours / 24)) })
}

export function SearchHeader({ searchQuery, onSearchChange, onScan, scanning, lastScanTime, projectCount, scanResult, onMenuClick }: SearchHeaderProps) {
  const { t } = useI18n()
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!lastScanTime) return
    const id = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [lastScanTime])

  const formattedTime = lastScanTime ? formatScanTime(lastScanTime, t) : null

  return (
    <header className="min-h-16 border-b border-stone-800 flex items-center gap-3 px-3 py-3 sm:px-4 lg:px-6 shrink-0">
      <button
        type="button"
        onClick={onMenuClick}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-stone-400 hover:bg-stone-800 hover:text-stone-100 lg:hidden"
        aria-label={t('sidebar.openNavigation')}
      >
        <Menu size={20} />
      </button>
      <div className="min-w-0 flex-1 xl:max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
          <input
            type="text"
            placeholder={t('search.placeholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 pl-10 pr-10 text-sm focus:outline-none focus:border-stone-600 focus:ring-1 focus:ring-stone-600 transition-all placeholder-stone-600 text-stone-200"
          />
          {searchQuery && (
            <button
              type="button"
              title={t('search.clear')}
              aria-label={t('search.clear')}
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-500 hover:bg-stone-800 hover:text-stone-200 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 lg:gap-3">
        <LanguageSwitcher />
        {formattedTime && (
          <span className="hidden max-w-64 text-xs text-stone-500 xl:inline">
            {scanResult
              ? t('search.scanSummary', {
                added: String(scanResult.added),
                removed: String(scanResult.removed),
                total: String(scanResult.total),
              })
              : t('search.scannedAgo', { time: formattedTime, count: String(projectCount) })}
          </span>
        )}
        <button
          onClick={onScan}
          disabled={scanning}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium p-2.5 sm:px-4 sm:py-2 rounded-lg transition-colors shadow-sm shadow-orange-500/20 flex items-center gap-2"
          aria-label={scanning ? t('search.scanning') : t('search.scan')}
        >
          <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{scanning ? t('search.scanning') : t('search.scan')}</span>
        </button>
      </div>
    </header>
  )
}

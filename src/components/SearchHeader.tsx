import { Search, RefreshCw } from 'lucide-react'
import { useI18n } from '../i18n'
import { LanguageSwitcher } from './LanguageSwitcher'

interface SearchHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onScan: () => void
  scanning: boolean
  lastScanTime: string | null
  projectCount: number
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

export function SearchHeader({ searchQuery, onSearchChange, onScan, scanning, lastScanTime, projectCount }: SearchHeaderProps) {
  const { t } = useI18n()
  const formattedTime = lastScanTime ? formatScanTime(lastScanTime, t) : null

  return (
    <header className="h-20 border-b border-stone-800 flex items-center justify-between px-8 shrink-0">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
          <input
            type="text"
            placeholder={t('search.placeholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-stone-600 focus:ring-1 focus:ring-stone-600 transition-all placeholder-stone-600 text-stone-200"
          />
        </div>
      </div>
      <div className="flex items-center gap-4 ml-4">
        <LanguageSwitcher />
        {formattedTime && (
          <span className="text-xs text-stone-500">
            {t('search.scannedAgo', { time: formattedTime, count: String(projectCount) })}
          </span>
        )}
        <button
          onClick={onScan}
          disabled={scanning}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm shadow-orange-500/20 flex items-center gap-2"
        >
          <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
          {scanning ? t('search.scanning') : t('search.scan')}
        </button>
      </div>
    </header>
  )
}

import { Folder, Search } from 'lucide-react'
import { useI18n } from '../i18n'

interface EmptyStateProps {
  type: 'no-projects' | 'no-results' | 'no-config'
  onAction?: () => void
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  const { t } = useI18n()

  if (type === 'no-config') {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-stone-800 rounded-2xl">
        <Folder className="text-stone-700 mb-4" size={48} />
        <p className="text-stone-400 mb-2">{t('empty.noConfig.title')}</p>
        <p className="text-stone-500 text-sm mb-4">{t('empty.noConfig.desc')}</p>
        {onAction && (
          <button onClick={onAction} className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            {t('empty.noConfig.action')}
          </button>
        )}
      </div>
    )
  }

  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-stone-800 rounded-2xl">
        <Search className="text-stone-700 mb-4" size={48} />
        <p className="text-stone-400">{t('empty.noResults.title')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-64 border border-dashed border-stone-800 rounded-2xl">
      <Folder className="text-stone-700 mb-4" size={48} />
      <p className="text-stone-400 mb-2">{t('empty.noProjects.title')}</p>
      <p className="text-stone-500 text-sm">{t('empty.noProjects.desc')}</p>
    </div>
  )
}

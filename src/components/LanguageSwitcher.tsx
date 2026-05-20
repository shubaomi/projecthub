import { Globe } from 'lucide-react'
import { useI18n } from '../i18n'

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n()

  return (
    <div className="flex items-center gap-1.5 bg-stone-800/50 rounded-lg p-1">
      <button
        onClick={() => setLang('en')}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
          lang === 'en'
            ? 'bg-orange-500 text-white'
            : 'text-stone-400 hover:text-stone-200 hover:bg-stone-700'
        }`}
        title="English"
      >
        EN
      </button>
      <button
        onClick={() => setLang('zh')}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
          lang === 'zh'
            ? 'bg-orange-500 text-white'
            : 'text-stone-400 hover:text-stone-200 hover:bg-stone-700'
        }`}
        title="中文"
      >
        中
      </button>
    </div>
  )
}
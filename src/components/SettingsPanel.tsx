import { motion, AnimatePresence } from 'motion/react'
import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Palette, Globe } from 'lucide-react'
import type { AppConfig, CategoryDefinition } from '../types'
import { useI18n } from '../i18n'

const DEFAULT_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#eab308', '#06b6d4', '#ef4444']

interface SettingsPanelProps {
  open: boolean
  config: AppConfig | null
  onClose: () => void
  onSave: (config: Partial<AppConfig>) => Promise<void>
}

export function SettingsPanel({ open, config, onClose, onSave }: SettingsPanelProps) {
  const { t, lang, setLang } = useI18n()
  const [directories, setDirectories] = useState<string[]>([])
  const [newDir, setNewDir] = useState('')
  const [customCategories, setCustomCategories] = useState<CategoryDefinition[]>([])
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(DEFAULT_COLORS[0])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Sync state when config changes (panel opens or config updates)
  useEffect(() => {
    if (config) {
      setDirectories(config.scanDirectories)
      setCustomCategories(config.customCategories)
      if (config.language) setLang(config.language as 'en' | 'zh')
    }
  }, [config])

  if (!open) return null

  const currentDirs = directories.length > 0 ? directories : (config?.scanDirectories || [])

  function handleAdd() {
    const trimmed = newDir.trim()
    if (!trimmed) return
    if (currentDirs.includes(trimmed)) {
      setError('Directory already in list')
      return
    }
    setDirectories([...currentDirs, trimmed])
    setNewDir('')
    setError(null)
  }

  function handleRemove(dir: string) {
    setDirectories(currentDirs.filter((d) => d !== dir))
  }

  function handleAddCategory() {
    const trimmed = newCatName.trim()
    if (!trimmed) return
    if (customCategories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('Category already exists')
      return
    }
    const id = trimmed.toLowerCase().replace(/\s+/g, '-')
    setCustomCategories([...customCategories, { id, name: trimmed, color: newCatColor }])
    setNewCatName('')
    setNewCatColor(DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)])
    setError(null)
  }

  function handleRemoveCategory(id: string) {
    setCustomCategories(customCategories.filter(c => c.id !== id))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await onSave({
        scanDirectories: currentDirs,
        customCategories,
        language: lang,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center" onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          className="bg-stone-900 border-2 border-stone-600 rounded-2xl w-full max-w-lg p-6 z-50 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-stone-100">{t('settings.title')}</h2>
            <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg transition-colors text-stone-400 hover:text-stone-200">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Scan Directories */}
            <div>
              <p className="text-sm text-stone-300 mb-2">{t('settings.scanDirs')}</p>
              <p className="text-xs text-stone-500 mb-3">{t('settings.scanDirsHint')}</p>

              <div className="space-y-2 mb-3">
                {currentDirs.map((dir) => (
                  <div key={dir} className="flex items-center justify-between bg-stone-800 border border-stone-700 rounded-lg px-3 py-2">
                    <span className="text-sm text-stone-300 font-mono">{dir}</span>
                    <button onClick={() => handleRemove(dir)} className="text-stone-500 hover:text-red-400 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {currentDirs.length === 0 && <p className="text-sm text-stone-600 italic">{t('settings.noDirs')}</p>}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDir}
                  onChange={(e) => setNewDir(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
                  placeholder="~/Workspace"
                  className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-stone-500 text-stone-200"
                />
                <button onClick={handleAdd} className="flex items-center gap-1.5 bg-stone-700 hover:bg-stone-600 text-stone-200 text-sm px-3 py-2 rounded-lg transition-colors">
                  <Plus size={16} /> {t('settings.add')}
                </button>
              </div>
            </div>

            {/* Custom Categories */}
            <div>
              <p className="text-sm text-stone-300 mb-2">{t('settings.customCategories')}</p>
              <p className="text-xs text-stone-500 mb-3">{t('settings.customCategoriesHint')}</p>

              <div className="space-y-2 mb-3">
                {customCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between bg-stone-800 border border-stone-700 rounded-lg px-3 py-2">
                    <span className="flex items-center gap-2 text-sm text-stone-300">
                      <Palette size={14} style={{ color: cat.color }} />
                      {cat.name}
                    </span>
                    <button onClick={() => handleRemoveCategory(cat.id)} className="text-stone-500 hover:text-red-400 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {customCategories.length === 0 && <p className="text-sm text-stone-600 italic">{t('settings.noCategories')}</p>}
              </div>

              <div className="space-y-3">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory() }}
                    placeholder="Category name"
                    className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-stone-500 text-stone-200"
                  />
                  <button onClick={handleAddCategory} className="flex items-center gap-1.5 bg-stone-700 hover:bg-stone-600 text-stone-200 text-sm px-3 py-2 rounded-lg transition-colors shrink-0">
                    <Plus size={16} /> {t('settings.add')}
                  </button>
                </div>
                <div className="flex gap-1 items-center">
                  <span className="text-xs text-stone-500 mr-1">{t('settings.color')}</span>
                  {DEFAULT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewCatColor(c)}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${newCatColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {/* Language */}
            <div>
              <p className="text-sm text-stone-300 mb-2">{t('settings.language')}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLang('en')}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${lang === 'en' ? 'bg-orange-500 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}
                >
                  English
                </button>
                <button
                  onClick={() => setLang('zh')}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${lang === 'zh' ? 'bg-orange-500 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}
                >
                  中文
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200 transition-colors">{t('settings.cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                {saving ? t('settings.saving') : t('settings.save')}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
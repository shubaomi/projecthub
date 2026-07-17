import { motion, AnimatePresence } from 'motion/react'
import { useState, useEffect, type DragEvent } from 'react'
import { X, Plus, Trash2, Palette, Pencil, Check, GripVertical } from 'lucide-react'
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

  // Rename state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  // Drag state for reordering
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!open || !config) return
    setDirectories([...config.scanDirectories])
    setCustomCategories([...config.customCategories])
    setNewDir('')
    setNewCatName('')
    setEditingCategoryId(null)
    setEditName('')
    setDragIndex(null)
    setDragOverIndex(null)
    setError(null)
    if (config.language) setLang(config.language as 'en' | 'zh')
  }, [open, config, setLang])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (config?.language) setLang(config.language as 'en' | 'zh')
      onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, config?.language, onClose, setLang])

  if (!open) return null

  const currentDirs = directories

  function handleCancel() {
    if (config?.language) setLang(config.language as 'en' | 'zh')
    onClose()
  }

  function handleAdd() {
    const trimmed = newDir.trim()
    if (!trimmed) return
    if (currentDirs.includes(trimmed)) {
      setError(t('settings.error.directoryExists'))
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
      setError(t('settings.error.categoryExists'))
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

  // Rename handlers — only changes name, keeps id stable
  function handleStartEdit(cat: CategoryDefinition) {
    setEditingCategoryId(cat.id)
    setEditName(cat.name)
    setError(null)
  }

  function handleConfirmRename() {
    const trimmed = editName.trim()
    if (!trimmed) {
      setError(t('settings.error.categoryNameEmpty'))
      return
    }
    if (customCategories.some(c => c.id !== editingCategoryId && c.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(t('settings.error.categoryExists'))
      return
    }
    setCustomCategories(customCategories.map(c =>
      c.id === editingCategoryId ? { ...c, name: trimmed } : c
    ))
    setEditingCategoryId(null)
    setEditName('')
    setError(null)
  }

  function handleCancelEdit() {
    setEditingCategoryId(null)
    setEditName('')
    setError(null)
  }

  // Drag handlers
  function handleCatDragStart(index: number) {
    if (editingCategoryId) return
    setDragIndex(index)
  }

  function handleCatDragOver(e: DragEvent, index: number) {
    e.preventDefault()
    if (editingCategoryId) return
    setDragOverIndex(index)
  }

  function handleCatDrop(index: number) {
    if (dragIndex === null || dragIndex === index) return
    const reordered = [...customCategories]
    const [removed] = reordered.splice(dragIndex, 1)
    reordered.splice(index, 0, removed)
    setCustomCategories(reordered)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  function handleCatDragEnd() {
    setDragIndex(null)
    setDragOverIndex(null)
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
      setError(err instanceof Error ? err.message : t('settings.error.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4" onClick={handleCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          className="bg-stone-900 border border-stone-600 rounded-2xl w-full max-w-lg z-50 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
          <div className="flex items-center justify-between border-b border-stone-800 px-6 py-4">
            <h2 id="settings-title" className="text-lg font-semibold text-stone-100">{t('settings.title')}</h2>
            <button onClick={handleCancel} aria-label={t('settings.close')} className="p-2 hover:bg-stone-800 rounded-lg transition-colors text-stone-400 hover:text-stone-200">
              <X size={20} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Scan Directories */}
              <div>
              <p className="text-sm text-stone-300 mb-2">{t('settings.scanDirs')}</p>
              <p className="text-xs text-stone-500 mb-3">{t('settings.scanDirsHint')}</p>

              <div className="space-y-2 mb-3">
                {currentDirs.map((dir) => (
                  <div key={dir} className="flex items-center justify-between bg-stone-800 border border-stone-700 rounded-lg px-3 py-2">
                    <span className="text-sm text-stone-300 font-mono">{dir}</span>
                    <button onClick={() => handleRemove(dir)} aria-label={t('settings.removeDirectory', { name: dir })} className="text-stone-500 hover:text-red-400 transition-colors p-1">
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
                {customCategories.map((cat, index) => (
                  <div
                    key={cat.id}
                    draggable={editingCategoryId !== cat.id}
                    onDragStart={() => handleCatDragStart(index)}
                    onDragOver={(e) => handleCatDragOver(e, index)}
                    onDrop={() => handleCatDrop(index)}
                    onDragEnd={handleCatDragEnd}
                    className={`flex items-center justify-between bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 transition-all
                      ${dragOverIndex === index && dragIndex !== index && editingCategoryId !== cat.id ? 'border-t-2 border-orange-500/50' : ''}
                      ${dragIndex === index ? 'opacity-50' : ''}`}
                  >
                    {editingCategoryId === cat.id ? (
                      /* Edit mode: inline input */
                      <div className="flex items-center gap-2 flex-1">
                        <Palette size={14} style={{ color: cat.color }} />
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmRename()
                            if (e.key === 'Escape') {
                              e.stopPropagation()
                              handleCancelEdit()
                            }
                          }}
                          autoFocus
                          className="flex-1 bg-stone-700 border border-stone-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-orange-500 text-stone-200"
                        />
                        <button onClick={handleConfirmRename} aria-label={t('settings.confirmRename')} className="text-stone-400 hover:text-green-400 transition-colors p-1">
                          <Check size={14} />
                        </button>
                        <button onClick={handleCancelEdit} aria-label={t('settings.cancelRename')} className="text-stone-500 hover:text-stone-300 transition-colors p-1">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      /* Normal mode: display with actions */
                      <>
                        <span className="flex items-center gap-2 text-sm text-stone-300 min-w-0">
                          <GripVertical size={14} className="text-stone-600 cursor-grab active:cursor-grabbing shrink-0" />
                          <Palette size={14} style={{ color: cat.color }} className="shrink-0" />
                          <span className="truncate">{cat.name}</span>
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => handleStartEdit(cat)} aria-label={t('settings.renameCategory', { name: cat.name })} className="text-stone-500 hover:text-stone-300 transition-colors p-1">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleRemoveCategory(cat.id)} aria-label={t('settings.removeCategory', { name: cat.name })} className="text-stone-500 hover:text-red-400 transition-colors p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
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
                    placeholder={t('settings.categoryName')}
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

              {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}

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

            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-stone-800 px-6 py-4">
            <button onClick={handleCancel} className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200 transition-colors">{t('settings.cancel')}</button>
            <button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              {saving ? t('settings.saving') : t('settings.save')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

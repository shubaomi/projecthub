import { motion, AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type { AppConfig } from '../types'

interface SettingsPanelProps {
  open: boolean
  config: AppConfig | null
  onClose: () => void
  onSave: (config: Partial<AppConfig>) => Promise<void>
}

export function SettingsPanel({ open, config, onClose, onSave }: SettingsPanelProps) {
  const [directories, setDirectories] = useState<string[]>([])
  const [newDir, setNewDir] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await onSave({ scanDirectories: currentDirs })
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
        className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center" onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          className="bg-stone-950 border border-stone-800 rounded-2xl w-full max-w-lg p-6 z-50" onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-stone-100">Settings</h2>
            <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg transition-colors text-stone-400 hover:text-stone-200">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-stone-300 mb-2">Scan Directories</p>
              <p className="text-xs text-stone-500 mb-3">Directories to recursively scan for projects. Use ~ for home directory.</p>

              <div className="space-y-2 mb-3">
                {currentDirs.map((dir) => (
                  <div key={dir} className="flex items-center justify-between bg-stone-900 border border-stone-800 rounded-lg px-3 py-2">
                    <span className="text-sm text-stone-300 font-mono">{dir}</span>
                    <button onClick={() => handleRemove(dir)} className="text-stone-500 hover:text-red-400 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {currentDirs.length === 0 && <p className="text-sm text-stone-600 italic">No directories configured</p>}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDir}
                  onChange={(e) => setNewDir(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
                  placeholder="~/Workspace"
                  className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-stone-600 text-stone-200"
                />
                <button onClick={handleAdd} className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm px-3 py-2 rounded-lg transition-colors">
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

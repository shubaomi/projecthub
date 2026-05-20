// server/services/ides.ts
// Static hardcoded list — no detection.
// Platform commands: win32 and darwin have separate command arrays.
import { platform } from 'node:os'
import type { IdeInfo } from '../types.js'

const osPlatform = platform()

// Windows commands
const WIN32_IDES: IdeInfo[] = [
  { id: 'vscode', name: 'VS Code', command: 'code', detected: true },
  { id: 'cursor', name: 'Cursor', command: 'cursor', detected: true },
  { id: 'trae', name: 'Trae', command: 'trae', detected: true },
  { id: 'trae-cn', name: 'Trae CN', command: 'trae-cn', detected: true },
  { id: 'qoder', name: 'Qoder', command: 'qoder', detected: true },
  { id: 'kiro', name: 'Kiro', command: 'kiro', detected: true },
  { id: 'antigravity', name: 'Antigravity', command: 'antigravity', detected: true },
]

// macOS commands
const DARWIN_IDES: IdeInfo[] = [
  { id: 'vscode', name: 'VS Code', command: 'code', detected: true },
  { id: 'cursor', name: 'Cursor', command: 'cursor', detected: true },
]

export async function detectIdes(): Promise<IdeInfo[]> {
  return osPlatform === 'darwin' ? DARWIN_IDES : WIN32_IDES
}
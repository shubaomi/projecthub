// server/services/config.ts
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { AppConfig, DEFAULT_CONFIG } from '../types.js'

const DATA_DIR = path.join(os.homedir(), '.projecthub')
const CONFIG_PATH = path.join(DATA_DIR, 'config.json')

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function readConfig(): AppConfig {
  ensureDataDir()
  if (!fs.existsSync(CONFIG_PATH)) {
    writeConfig(DEFAULT_CONFIG)
    return { ...DEFAULT_CONFIG }
  }
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
  const parsed = JSON.parse(raw)
  return { ...DEFAULT_CONFIG, ...parsed }
}

export function writeConfig(config: AppConfig): void {
  ensureDataDir()
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

export function expandHomeDir(dir: string): string {
  if (dir.startsWith('~/') || dir === '~') {
    return path.join(os.homedir(), dir.slice(1))
  }
  return dir
}

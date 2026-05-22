# ProjectHub Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local project management desktop app with automatic project scanning, Git status summaries, README previews, and one-click IDE/terminal launching.

**Architecture:** React 19 + Vite frontend on `localhost:3000`, Express 4 backend on `localhost:3001`, JSON file storage (`~/.projecthub/`). Frontend communicates via REST API proxy. Production mode serves everything from Express on a single port.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, motion (framer-motion), lucide-react, Express 4, tsx, Node.js child_process

---

## File Structure

### Backend (`server/`)
```
server/
├── index.ts              Express entry + production static serving
├── types.ts              Shared types (Project, Config, ApiResponse, etc.)
├── services/
│   ├── config.ts         ~/.projecthub/config.json read/write
│   ├── scanner.ts        Directory traversal + project detection
│   ├── git.ts            git status branch + porcelain + all branches
│   ├── actions.ts        Open VS Code / terminal / folder / dynamic IDE (cmd.exe /c or open -a)
│   └── ides.ts           Static hardcoded IDE list (no detection), platform-specific
└── routes/
    └── api.ts            All /api/* route handlers
      GET  /projects              — list all projects (no git, fast)
      GET  /projects/:id          — project detail with full git + readme
      GET  /projects/:id/git      — git status only (on-demand)
      POST /scan                  — trigger scan
      GET  /config                — read config
      PUT  /config                — write config
      PATCH /projects/:id/category — update custom category
      POST /open                  — execute IDE action (whitelist validated each request)
      GET  /ides                  — available IDE list
```

### Frontend (`src/`)
```
src/
├── main.tsx              Entry point (existing, keep)
├── index.css             Global styles (existing, keep)
├── types.ts              Frontend types mirroring server shapes
├── api/
│   └── client.ts         fetch wrapper for all API calls
├── hooks/
│   ├── useProjects.ts    Projects state + fetch/scan
│   └── useConfig.ts      Config state + update
├── components/
│   ├── Sidebar.tsx        Navigation + category filters
│   ├── SearchHeader.tsx   Search bar + scan button + last-scan time
│   ├── ProjectGrid.tsx    Animated grid container
│   ├── ProjectCard.tsx    Single card with icon/tags/git/readme/actions
│   ├── GitStatusBadge.tsx Branch name + change counts
│   ├── ReadmeExcerpt.tsx  README text preview
│   ├── ProjectDetail.tsx  Slide-out detail panel
│   ├── SettingsPanel.tsx  Scan directory editor modal
│   ├── EmptyState.tsx     Empty/no-results states
│   └── SkeletonLoader.tsx Loading skeleton cards
└── App.tsx               Refactored main layout (no mock data)
```

### Config files
```
vite.config.ts            Add proxy /api → localhost:3001
package.json              Add dev:server, build:server scripts
```

---

## Chunk 1: Foundation — Types, Config Service

### Task 1.1: Create server types

**Files:**
- Create: `server/types.ts`

- [ ] **Step 1: Write the types file**

```typescript
// server/types.ts

export interface Project {
  id: string
  name: string
  path: string
  type: string
  projectFile: string
  tags: string[]
  customCategory: string | null
  firstSeen: string
  lastScanned: string
}

export interface ProjectList {
  projects: Project[]
}

export interface GitStatus {
  branch: string
  allBranches: string[]
  ahead: number
  behind: number
  modified: string[]
  added: string[]
  deleted: string[]
  untracked: string[]
  isRepo: boolean
}

export interface ProjectDetail extends Project {
  git: GitStatus
  readme: string | null
  lastModified: string
}

export interface CategoryDefinition {
  id: string
  name: string
  color: string
}

export interface AppConfig {
  scanDirectories: string[]
  scanDepth: number
  excludePatterns: string[]
  lastScanTime: string | null
  customCategories: CategoryDefinition[]
  preferredIde: string | null
  language: string
}

export interface IdeInfo {
  id: string
  name: string
  command: string
  detected: boolean
}

export type OpenAction = 'vscode' | 'terminal' | 'folder' | string

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface ScanResult {
  found: number
  added: number
  removed: number
  total: number
  duration: number
}

export const DEFAULT_CONFIG: AppConfig = {
  scanDirectories: [],
  scanDepth: 3,
  excludePatterns: ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'target'],
  lastScanTime: null,
  customCategories: [],
  preferredIde: null,
  language: 'en',
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsx --eval "import './server/types.ts'; console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add server/types.ts
git commit -m "feat: add server types and default config"
```

---

### Task 1.2: Implement Config Service

**Files:**
- Create: `server/services/config.ts`

- [ ] **Step 1: Write the config service**

```typescript
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
```

- [ ] **Step 2: Verify**

Run: `npx tsx -e "import { readConfig } from './server/services/config'; console.log('Config:', JSON.stringify(readConfig(), null, 2));"`
Expected: Prints config object with default values

- [ ] **Step 3: Commit**

```bash
git add server/services/config.ts
git commit -m "feat: add config service with default config generation"
```

---

### Task 1.3: Add package scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add backend scripts**

Add the following scripts to the existing `"scripts"` block in `package.json`:

```json
"dev:server": "tsx watch server/index.ts",
"build:server": "esbuild server/index.ts --bundle --platform=node --outfile=dist-server/server.js --format=esm",
"build:all": "vite build && npm run build:server",
"start": "node dist-server/server.js"
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add backend dev/build/start scripts"
```

---

## Chunk 2: Backend Services — Scanner, Git, Actions

### Task 2.1: Implement Project Scanner

**Files:**
- Create: `server/services/scanner.ts`

- [ ] **Step 1: Write the scanner service**

```typescript
// server/services/scanner.ts
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { readConfig, writeConfig, expandHomeDir } from './config.js'
import { Project, ProjectList, ScanResult } from '../types.js'

const PROJECTS_PATH = path.join(
  require('node:os').homedir(),
  '.projecthub',
  'projects.json'
)

const PROJECT_FILES: Record<string, string> = {
  'package.json': 'Node.js',
  'go.mod': 'Go',
  'Cargo.toml': 'Rust',
  'requirements.txt': 'Python',
  'pyproject.toml': 'Python',
  'Pipfile': 'Python',
  '.csproj': '.NET',
  'pom.xml': 'Java',
  'build.gradle': 'Java',
}

const FRAMEWORK_DEPS: Record<string, string> = {
  'next': 'Next.js',
  'react': 'React',
  'vue': 'Vue',
  'svelte': 'Svelte',
  'nestjs': 'NestJS',
  'express': 'Express',
  'vite': 'Vite',
  'astro': 'Astro',
  'remix': 'Remix',
  'nuxt': 'Nuxt',
}

function generateId(projectPath: string): string {
  return crypto.createHash('md5').update(projectPath).digest('hex').slice(0, 8)
}

function detectProjectType(projectPath: string): { type: string; projectFile: string; tags: string[] } {
  for (const [file, projectType] of Object.entries(PROJECT_FILES)) {
    if (fs.existsSync(path.join(projectPath, file))) {
      const tags: string[] = [projectType]
      if (file === 'package.json') {
        try {
          const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'))
          const deps = { ...pkg.dependencies, ...pkg.devDependencies }
          for (const [dep, framework] of Object.entries(FRAMEWORK_DEPS)) {
            if (deps[dep]) {
              tags.push(framework)
            }
          }
          if (tags.length === 1) {
            return { type: 'Node.js', projectFile: 'package.json', tags }
          }
          return { type: tags[1], projectFile: 'package.json', tags }
        } catch {
          return { type: 'Node.js', projectFile: 'package.json', tags }
        }
      }
      return { type: projectType, projectFile: file, tags }
    }
  }
  if (fs.existsSync(path.join(projectPath, '.git'))) {
    return { type: 'Unknown', projectFile: '.git', tags: ['Other'] }
  }
  return { type: 'Unknown', projectFile: '', tags: [] }
}

function loadProjectCache(): Project[] {
  if (!fs.existsSync(PROJECTS_PATH)) return []
  try {
    const raw = fs.readFileSync(PROJECTS_PATH, 'utf-8')
    const data: ProjectList = JSON.parse(raw)
    return data.projects || []
  } catch {
    return []
  }
}

function saveProjectCache(projects: Project[]): void {
  const dir = path.dirname(PROJECTS_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(PROJECTS_PATH, JSON.stringify({ projects }, null, 2), 'utf-8')
}

export function scan(): ScanResult {
  const start = Date.now()
  const config = readConfig()
  const existing = loadProjectCache()
  const existingMap = new Map(existing.map((p) => [p.path, p]))

  const found: Project[] = []
  let added = 0
  const now = new Date().toISOString()

  for (const dir of config.scanDirectories) {
    const expanded = expandHomeDir(dir)
    if (!fs.existsSync(expanded)) continue
    scanDirectory(expanded, config.scanDepth, config.excludePatterns, found)
  }

  for (const project of found) {
    const existingProject = existingMap.get(project.path)
    if (existingProject) {
      existingProject.lastScanned = now
      existingMap.set(project.path, existingProject)
    } else {
      added++
      existingMap.set(project.path, {
        ...project,
        id: generateId(project.path),
        firstSeen: now,
        lastScanned: now,
      })
    }
  }

  const seenPaths = new Set(found.map((p) => p.path))
  let removed = 0
  for (const [projectPath] of existingMap) {
    if (!seenPaths.has(projectPath)) {
      removed++
      existingMap.delete(projectPath)
    }
  }

  const projects = Array.from(existingMap.values())
  saveProjectCache(projects)

  config.lastScanTime = now
  writeConfig(config)

  return {
    found: found.length,
    added,
    removed,
    total: projects.length,
    duration: Date.now() - start,
  }
}

function scanDirectory(
  dirPath: string,
  depth: number,
  excludePatterns: string[],
  results: Project[]
): void {
  if (depth <= 0) return

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.git') continue
    if (excludePatterns.includes(entry.name)) continue

    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      if (isProjectDirectory(fullPath)) {
        const info = detectProjectType(fullPath)
        if (info.projectFile) {
          results.push({
            id: generateId(fullPath),
            name: entry.name,
            path: fullPath,
            type: info.type,
            projectFile: info.projectFile,
            tags: info.tags,
            firstSeen: '',
            lastScanned: '',
          })
        }
      } else {
        scanDirectory(fullPath, depth - 1, excludePatterns, results)
      }
    }
  }
}

function isProjectDirectory(dirPath: string): boolean {
  for (const file of Object.keys(PROJECT_FILES)) {
    if (fs.existsSync(path.join(dirPath, file))) return true
  }
  if (fs.existsSync(path.join(dirPath, '.git'))) return true
  return false
}

export function loadProjects(): Project[] {
  return loadProjectCache()
}

export function getProjectById(id: string): Project | undefined {
  return loadProjectCache().find((p) => p.id === id)
}
```

- [ ] **Step 2: Verify**

Run: `npx tsx -e "import { loadProjects } from './server/services/scanner'; console.log('Projects loaded:', loadProjects().length); console.log('OK');"`
Expected: `0` (no scans yet) or count, plus `OK`

- [ ] **Step 3: Commit**

```bash
git add server/services/scanner.ts
git commit -m "feat: add project scanner with directory traversal and type detection"
```

---

### Task 2.2: Implement Git Service

**Files:**
- Create: `server/services/git.ts`

- [ ] **Step 1: Write the git service**

```typescript
// server/services/git.ts
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { GitStatus } from '../types.js'

const EMPTY_STATUS: GitStatus = {
  branch: '',
  ahead: 0,
  behind: 0,
  modified: [],
  added: [],
  deleted: [],
  untracked: [],
  isRepo: false,
}

export function getGitStatus(projectPath: string): GitStatus {
  const gitDir = path.join(projectPath, '.git')
  if (!fs.existsSync(gitDir)) return EMPTY_STATUS

  try {
    const branchOutput = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: projectPath,
      timeout: 5000,
      encoding: 'utf-8',
    }).trim()

    if (!branchOutput || branchOutput === 'HEAD') {
      return { ...EMPTY_STATUS, isRepo: true, branch: 'HEAD (detached)' }
    }

    const status: GitStatus = {
      branch: branchOutput,
      ahead: 0,
      behind: 0,
      modified: [],
      added: [],
      deleted: [],
      untracked: [],
      isRepo: true,
    }

    const porcelain = execSync('git status --porcelain -b', {
      cwd: projectPath,
      timeout: 5000,
      encoding: 'utf-8',
    })

    const lines = porcelain.split('\n')

    for (const line of lines) {
      if (line.startsWith('## ')) {
        const aheadMatch = line.match(/ahead (\d+)/)
        const behindMatch = line.match(/behind (\d+)/)
        if (aheadMatch) status.ahead = parseInt(aheadMatch[1], 10)
        if (behindMatch) status.behind = parseInt(behindMatch[1], 10)
        continue
      }

      if (line.length < 2) continue

      const xy = line.slice(0, 2)
      const filename = line.slice(3).trim()
      const index = xy[0]
      const worktree = xy[1]

      if (index === '?' && worktree === '?') {
        status.untracked.push(filename)
      } else {
        if (index === 'M' || index === 'A' || index === 'D' || index === 'R') {
          if (index === 'A') status.added.push(filename)
          else if (index === 'D') status.deleted.push(filename)
          else status.modified.push(filename)
        }
        if (worktree === 'M' || worktree === 'D') {
          if (!status.modified.includes(filename)) {
            status.modified.push(filename)
          }
        }
      }
    }

    return status
  } catch {
    return { ...EMPTY_STATUS, isRepo: false }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/services/git.ts
git commit -m "feat: add git status service with porcelain parsing"
```

---

### Task 2.3: Implement Actions Service

**Files:**
- Create: `server/services/actions.ts`

- [ ] **Step 1: Write the actions service**

```typescript
// server/services/actions.ts
import { exec } from 'node:child_process'
import { OpenAction } from '../types.js'
import { getProjectById } from './scanner.js'

const platform = process.platform

export function executeAction(projectId: string, action: OpenAction): Promise<string> {
  const project = getProjectById(projectId)
  if (!project) {
    return Promise.reject(new Error(`Project not found: ${projectId}`))
  }

  const projectPath = project.path

  return new Promise((resolve, reject) => {
    let command: string

    switch (action) {
      case 'vscode':
        command = platform === 'win32' ? `code.cmd "${projectPath}"` : `code "${projectPath}"`
        break
      case 'terminal':
        if (platform === 'win32') {
          command = `start wt.exe -d "${projectPath}"`
        } else if (platform === 'darwin') {
          command = `open -a Terminal "${projectPath}"`
        } else {
          command = `gnome-terminal --working-directory="${projectPath}"`
        }
        break
      case 'folder':
        if (platform === 'win32') {
          command = `start "" "${projectPath}"`
        } else if (platform === 'darwin') {
          command = `open "${projectPath}"`
        } else {
          command = `xdg-open "${projectPath}"`
        }
        break
      default:
        reject(new Error(`Unknown action: ${action}`))
        return
    }

    exec(command, (error) => {
      if (error) {
        reject(new Error(`Failed to execute ${action}: ${error.message}`))
      } else {
        resolve(`Executed ${action} for ${project.name}`)
      }
    })
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add server/services/actions.ts
git commit -m "feat: add quick actions service for vscode/terminal/folder"
```

---

## Chunk 3: Backend API Routes + Server Entry Point

### Task 3.1: Implement API Routes

**Files:**
- Create: `server/routes/api.ts`

**Current implementation highlights:**

- `GET /projects` — no longer calls `getGitStatus()` per project; returns list fast (O(N×fileIO))
- `GET /projects/:id/git` — new endpoint for on-demand git status per project
- `POST /open` — calls `detectIdes()` on each request to build whitelist; rejects non-whitelisted actions with 400

- [ ] **Step 2: Verify API endpoints**
```bash
curl -s http://127.0.0.1:3001/api/projects | jq '.success, .data[0].git'
# Should show: true, null (git not in list response)

curl -s http://127.0.0.1:3001/api/projects/452fb6dd/git | jq '.success, .data.branch'
# Should show: true, "main" (or actual branch)
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/api.ts
git commit -m "feat: add API routes for projects, scan, config, and open actions"
```

---

### Task 3.2: Create Server Entry Point

**Files:**
- Create: `server/index.ts`

- [ ] **Step 1: Write the Express entry point**

```typescript
// server/index.ts
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApiRouter } from './routes/api.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())
app.use('/api', createApiRouter())

// Production: serve frontend static files
const distPath = path.resolve(__dirname, '..', 'dist')
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`ProjectHub backend running on http://127.0.0.1:${PORT}`)
})
```

- [ ] **Step 2: Verify server starts and responds**

Start server in background, test with curl:
```bash
npx tsx server/index.ts &
sleep 2
curl -s http://127.0.0.1:3001/api/config
kill %1
```
Expected: JSON with `success: true` and config data

- [ ] **Step 3: Commit**

```bash
git add server/index.ts
git commit -m "feat: add Express server entry point with API and static serving"
```

---

## Chunk 4: Frontend API Layer + Hooks

### Task 4.1: Create frontend types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write frontend types**

```typescript
// src/types.ts

export interface GitStatus {
  branch: string
  allBranches: string[]
  ahead: number
  behind: number
  modified: string[]
  added: string[]
  deleted: string[]
  untracked: string[]
  isRepo: boolean
}

export interface Project {
  id: string
  name: string
  path: string
  type: string
  projectFile: string
  tags: string[]
  customCategory: string | null
  firstSeen: string
  lastScanned: string
}

export interface ProjectDetail extends Project {
  git: GitStatus | null   // null while loading (lazy-loaded after list render)
  readme: string | null
  lastModified: string
}

export interface CategoryDefinition {
  id: string
  name: string
  color: string
}

export interface AppConfig {
  scanDirectories: string[]
  scanDepth: number
  excludePatterns: string[]
  lastScanTime: string | null
  customCategories: CategoryDefinition[]
  preferredIde: string | null
  language: string
}

export interface ScanResult {
  found: number
  added: number
  removed: number
  total: number
  duration: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface IdeInfo {
  id: string
  name: string
  command: string
  detected: boolean
  platform?: 'win32' | 'darwin' | 'all'
}

export type OpenAction = 'vscode' | 'terminal' | 'folder' | string

export interface TypeGroup {
  type: string
  count: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add frontend type definitions"
```

---

### Task 4.2: Create API client

**Files:**
- Create: `src/api/client.ts`

- [ ] **Step 1: Write the API client**

```typescript
// src/api/client.ts
import type { ApiResponse, ProjectDetail, AppConfig, ScanResult } from '../types'

const BASE_URL = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json: ApiResponse<T> = await res.json()
  if (!json.success) throw new Error(json.error || 'Unknown API error')
  return json.data as T
}

export function fetchProjects(params?: { search?: string; type?: string; tag?: string }): Promise<ProjectDetail[]> {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set('search', params.search)
  if (params?.type) searchParams.set('type', params.type)
  if (params?.tag) searchParams.set('tag', params.tag)
  const qs = searchParams.toString()
  return request<ProjectDetail[]>(`/projects${qs ? `?${qs}` : ''}`)
}

export function fetchProject(id: string): Promise<ProjectDetail> {
  return request<ProjectDetail>(`/projects/${encodeURIComponent(id)}`)
}

export function triggerScan(): Promise<ScanResult> {
  return request<ScanResult>('/scan', { method: 'POST', body: '{}' })
}

export function fetchConfig(): Promise<AppConfig> {
  return request<AppConfig>('/config')
}

export function updateConfig(config: Partial<AppConfig>): Promise<AppConfig> {
  return request<AppConfig>('/config', { method: 'PUT', body: JSON.stringify(config) })
}

export function executeOpenAction(projectId: string, action: string): Promise<{ message: string }> {
  return request<{ message: string }>('/open', {
    method: 'POST',
    body: JSON.stringify({ projectId, action }),
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api/client.ts
git commit -m "feat: add frontend API client layer"
```

---

### Task 4.3: Create data hooks

**Files:**
- Create: `src/hooks/useProjects.ts`
- Create: `src/hooks/useConfig.ts`

**Current implementation highlights:**

- `useProjects` hook initializes `git: null` for all projects, then lazy-loads git status via `fetchProjectGit()` with `pMapLimit(8)` concurrency pool
- Git status "light up" progressively as each fetch completes
- Non-fatal: individual git fetch failures leave `git: null` (no error thrown)

- [ ] **Step 1: Write useProjects hook** (current implementation)

```typescript
// src/hooks/useProjects.ts
async function pMapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return results
}

export function useProjects(): UseProjectsReturn {
  // ...state setup...
  const refresh = useCallback(async () => {
    setLoading(true)
    const data = await fetchProjects()
    const withNullGit = data.map(p => ({ ...p, git: null as GitStatus | null }))
    setProjects(withNullGit)

    await pMapLimit(withNullGit, 8, async (p) => {
      try {
        const git = await fetchProjectGit(p.id)
        setProjects(prev => prev.map(existing => existing.id === p.id ? { ...existing, git } : existing))
      } catch {
        // non-fatal: leave git as null
      }
    })
    // ...
  }, [])
  // ...
}
```

- [ ] **Step 2: Write useConfig hook** (unchanged)

```typescript
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

---

## Chunk 5: Frontend Components — Cards, Grid, Sidebar, Search

### Task 5.1: Create GitStatusBadge component

**Files:**
- Create: `src/components/GitStatusBadge.tsx`

**Current implementation highlights:**

- Accepts `git: GitStatus | null` (handles null while loading)
- Shows animated `…` placeholder with pulse effect when `git === null`
- Non-git-repo (`!git.isRepo`) returns `null` (no badge shown)

- [ ] **Step 1: Write the component** (current implementation)

```typescript
// src/components/GitStatusBadge.tsx
export function GitStatusBadge({ git }: GitStatusBadgeProps) {
  if (git === null) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-stone-600 animate-pulse">
        <GitBranch size={12} />
        <span>…</span>
      </div>
    )
  }
  if (!git.isRepo) return null
  // ...branch + change count rendering
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GitStatusBadge.tsx
git commit -m "feat: add GitStatusBadge component"
```

---

### Task 5.2: Create ReadmeExcerpt component

**Files:**
- Create: `src/components/ReadmeExcerpt.tsx`

- [ ] **Step 1: Write the component**

```typescript
import { FileText } from 'lucide-react'

interface ReadmeExcerptProps {
  readme: string | null
  maxLen?: number
}

export function ReadmeExcerpt({ readme, maxLen = 200 }: ReadmeExcerptProps) {
  if (!readme) return null

  const text = readme.slice(0, maxLen)
  const truncated = readme.length > maxLen ? text + '...' : text

  return (
    <div className="flex items-start gap-1.5 text-xs text-stone-500 mt-2 mb-2 line-clamp-2">
      <FileText size={12} className="mt-0.5 shrink-0" />
      <span>{truncated}</span>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ReadmeExcerpt.tsx
git commit -m "feat: add ReadmeExcerpt component"
```

---

### Task 5.3: Create ProjectCard component

**Files:**
- Create: `src/components/ProjectCard.tsx`

- [ ] **Step 1: Write ProjectCard**

```typescript
import { motion } from 'motion/react'
import {
  Code2, Folder, Terminal, MoreVertical, Globe, Server, Cpu,
} from 'lucide-react'
import type { ProjectDetail } from '../types'
import { GitStatusBadge } from './GitStatusBadge'
import { ReadmeExcerpt } from './ReadmeExcerpt'

interface ProjectCardProps {
  project: ProjectDetail
  onOpen: (action: 'vscode' | 'terminal' | 'folder') => void
  onClick: () => void
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  React: Code2, 'Next.js': Globe, Vue: Code2, Svelte: Code2,
  'Node.js': Server, Go: Code2, Rust: Code2, Python: Code2,
  '.NET': Code2, Java: Code2, Unknown: Folder,
}

const COLOR_MAP: Record<string, { color: string; bg: string }> = {
  React: { color: 'text-blue-400', bg: 'bg-blue-400/10' },
  'Next.js': { color: 'text-slate-300', bg: 'bg-slate-300/10' },
  Vue: { color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  Svelte: { color: 'text-orange-400', bg: 'bg-orange-400/10' },
  'Node.js': { color: 'text-green-400', bg: 'bg-green-400/10' },
  Go: { color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  Rust: { color: 'text-amber-400', bg: 'bg-amber-400/10' },
  Python: { color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  '.NET': { color: 'text-purple-400', bg: 'bg-purple-400/10' },
  Java: { color: 'text-red-400', bg: 'bg-red-400/10' },
  Unknown: { color: 'text-stone-400', bg: 'bg-stone-400/10' },
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export function ProjectCard({ project, onOpen, onClick }: ProjectCardProps) {
  const Icon = ICON_MAP[project.type] || Folder
  const colors = COLOR_MAP[project.type] || COLOR_MAP.Unknown
  const formattedTime = project.lastModified ? formatRelativeTime(project.lastModified) : ''

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-stone-900/50 border border-stone-800 rounded-2xl p-5 hover:border-stone-700 transition-colors group flex flex-col cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${colors.bg}`}>
          <Icon size={24} className={colors.color} />
        </div>
        <button className="text-stone-600 hover:text-stone-300 transition-colors p-1" onClick={(e) => e.stopPropagation()}>
          <MoreVertical size={18} />
        </button>
      </div>

      <h3 className="text-stone-100 font-medium text-lg mb-1 truncate">{project.name}</h3>

      <div className="font-mono text-xs text-stone-500 mb-1 truncate flex items-center gap-1.5" title={project.path}>
        <Terminal size={12} />
        {project.path}
      </div>

      <GitStatusBadge git={project.git} />
      <ReadmeExcerpt readme={project.readme} />

      <div className="flex flex-wrap gap-2 mb-4">
        {project.tags.map((tag) => (
          <span key={tag} className="px-2 py-1 bg-stone-800 text-stone-300 rounded-md text-xs font-medium border border-stone-700/50">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-stone-800/50 flex items-center justify-between">
        {formattedTime && <span className="text-xs text-stone-500">Updated {formattedTime}</span>}
        <div className="flex gap-2 ml-auto">
          {(['vscode', 'terminal', 'folder'] as const).map((action) => {
            const Icon = action === 'vscode' ? Code2 : action === 'terminal' ? Terminal : Folder
            return (
              <button
                key={action}
                className="bg-stone-800 hover:bg-stone-700 text-stone-200 p-2 rounded-lg transition-colors"
                title={`Open ${action}`}
                onClick={(e) => { e.stopPropagation(); onOpen(action) }}
              >
                <Icon size={16} />
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProjectCard.tsx
git commit -m "feat: add ProjectCard with git badge, readme, and actions"
```

---

### Task 5.4: Create ProjectGrid, Sidebar, SearchHeader

**Files:**
- Create: `src/components/ProjectGrid.tsx`
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/SearchHeader.tsx`

- [ ] **Step 1: Write ProjectGrid**

```typescript
import { motion, AnimatePresence } from 'motion/react'
import type { ProjectDetail } from '../types'
import { ProjectCard } from './ProjectCard'

interface ProjectGridProps {
  projects: ProjectDetail[]
  onOpenAction: (projectId: string, action: 'vscode' | 'terminal' | 'folder') => void
  onProjectClick: (project: ProjectDetail) => void
}

export function ProjectGrid({ projects, onOpenAction, onProjectClick }: ProjectGridProps) {
  return (
    <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <AnimatePresence>
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onOpen={(action) => onOpenAction(project.id, action)}
            onClick={() => onProjectClick(project)}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
```

- [ ] **Step 2: Write Sidebar**

```typescript
import { Folder, LayoutGrid, Server, Settings } from 'lucide-react'
import type { TypeGroup } from '../types'

interface SidebarProps {
  typeGroups: TypeGroup[]
  activeCategory: string
  onCategoryChange: (category: string) => void
  onSettingsClick: () => void
}

export function Sidebar({ typeGroups, activeCategory, onCategoryChange, onSettingsClick }: SidebarProps) {
  const total = typeGroups.reduce((sum, g) => sum + g.count, 0)

  return (
    <div className="w-64 border-r border-stone-800 bg-stone-950/50 flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3 text-stone-100 font-semibold text-lg tracking-tight">
          <div className="bg-orange-500 p-1.5 rounded-lg text-white">
            <Folder size={20} strokeWidth={2.5} />
          </div>
          Project Hub
        </div>
      </div>

      <div className="px-4 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">Categories</div>
      <div className="px-3 flex-1 overflow-y-auto space-y-1">
        <CategoryButton
          label="All"
          count={total}
          isActive={activeCategory === 'All'}
          onClick={() => onCategoryChange('All')}
        />
        {typeGroups.filter(g => g.count > 0).map((group) => (
          <CategoryButton
            key={group.type}
            label={group.type}
            count={group.count}
            isActive={activeCategory === group.type}
            onClick={() => onCategoryChange(group.type)}
          />
        ))}
      </div>

      <div className="p-4 border-t border-stone-800">
        <button
          onClick={onSettingsClick}
          className="flex items-center gap-3 text-sm text-stone-400 hover:text-stone-200 w-full px-3 py-2 rounded-lg hover:bg-stone-800/50 transition-colors"
        >
          <Settings size={18} /> Settings
        </button>
      </div>
    </div>
  )
}

function CategoryButton({ label, count, isActive, onClick }: { label: string; count: number; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between
        ${isActive ? 'bg-stone-800 text-stone-100 font-medium' : 'hover:bg-stone-800/50 text-stone-400 hover:text-stone-200'}`}
    >
      <span className="flex items-center gap-3">
        <LayoutGrid size={16} />{label}
      </span>
      <span className="text-xs text-stone-500">{count}</span>
    </button>
  )
}
```

- [ ] **Step 3: Write SearchHeader**

```typescript
import { Search, RefreshCw } from 'lucide-react'

interface SearchHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onScan: () => void
  scanning: boolean
  lastScanTime: string | null
  projectCount: number
}

function formatScanTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function SearchHeader({ searchQuery, onSearchChange, onScan, scanning, lastScanTime, projectCount }: SearchHeaderProps) {
  const formattedTime = lastScanTime ? formatScanTime(lastScanTime) : null

  return (
    <header className="h-20 border-b border-stone-800 flex items-center justify-between px-8 shrink-0">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
          <input
            type="text"
            placeholder="Search projects, tags, or frameworks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-stone-600 focus:ring-1 focus:ring-stone-600 transition-all placeholder-stone-600 text-stone-200"
          />
        </div>
      </div>
      <div className="flex items-center gap-4 ml-4">
        {formattedTime && (
          <span className="text-xs text-stone-500">Scanned {formattedTime} · {projectCount} projects</span>
        )}
        <button
          onClick={onScan}
          disabled={scanning}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm shadow-orange-500/20 flex items-center gap-2"
        >
          <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
          {scanning ? 'Scanning...' : 'Scan Now'}
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ProjectGrid.tsx src/components/Sidebar.tsx src/components/SearchHeader.tsx
git commit -m "feat: add ProjectGrid, Sidebar, and SearchHeader components"
```

---

## Chunk 6: Frontend Components — Detail, Settings, States

### Task 6.1: Create EmptyState and SkeletonLoader

**Files:**
- Create: `src/components/EmptyState.tsx`
- Create: `src/components/SkeletonLoader.tsx`

- [ ] **Step 1: Write EmptyState**

```typescript
import { Folder, Search } from 'lucide-react'

interface EmptyStateProps {
  type: 'no-projects' | 'no-results' | 'no-config'
  onAction?: () => void
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  if (type === 'no-config') {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-stone-800 rounded-2xl">
        <Folder className="text-stone-700 mb-4" size={48} />
        <p className="text-stone-400 mb-2">No scan directories configured</p>
        <p className="text-stone-500 text-sm mb-4">Add directories in Settings to discover your projects</p>
        {onAction && (
          <button onClick={onAction} className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            Open Settings
          </button>
        )}
      </div>
    )
  }

  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-stone-800 rounded-2xl">
        <Search className="text-stone-700 mb-4" size={48} />
        <p className="text-stone-400">No projects match your search or filter.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-64 border border-dashed border-stone-800 rounded-2xl">
      <Folder className="text-stone-700 mb-4" size={48} />
      <p className="text-stone-400 mb-2">No projects found</p>
      <p className="text-stone-500 text-sm">Click "Scan Now" to discover your projects</p>
    </div>
  )
}
```

- [ ] **Step 2: Write SkeletonLoader**

```typescript
export function SkeletonLoader({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-stone-900/50 border border-stone-800 rounded-2xl p-5 animate-pulse">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-stone-800 w-12 h-12" />
            <div className="bg-stone-800 w-8 h-8 rounded" />
          </div>
          <div className="bg-stone-800 h-5 w-2/3 rounded mb-2" />
          <div className="bg-stone-800 h-4 w-full rounded mb-3" />
          <div className="flex gap-2 mb-6">
            <div className="bg-stone-800 h-6 w-16 rounded-md" />
            <div className="bg-stone-800 h-6 w-20 rounded-md" />
          </div>
          <div className="pt-4 border-t border-stone-800/50 flex items-center justify-between">
            <div className="bg-stone-800 h-4 w-24 rounded" />
            <div className="flex gap-2">
              <div className="bg-stone-800 w-8 h-8 rounded-lg" />
              <div className="bg-stone-800 w-8 h-8 rounded-lg" />
              <div className="bg-stone-800 w-8 h-8 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/EmptyState.tsx src/components/SkeletonLoader.tsx
git commit -m "feat: add EmptyState and SkeletonLoader components"
```

---

### Task 6.2: Create ProjectDetail panel

**Files:**
- Create: `src/components/ProjectDetail.tsx`

- [ ] **Step 1: Write ProjectDetail**

```typescript
import { motion, AnimatePresence } from 'motion/react'
import { X, Code2, Terminal, Folder } from 'lucide-react'
import type { ProjectDetail as ProjectDetailType } from '../types'
import { GitStatusBadge } from './GitStatusBadge'

interface ProjectDetailProps {
  project: ProjectDetailType | null
  onClose: () => void
  onOpenAction: (projectId: string, action: 'vscode' | 'terminal' | 'folder') => void
}

export function ProjectDetailPanel({ project, onClose, onOpenAction }: ProjectDetailProps) {
  return (
    <AnimatePresence>
      {project && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40" onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-[500px] bg-stone-950 border-l border-stone-800 z-50 overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-stone-100">{project.name}</h2>
                <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg transition-colors text-stone-400 hover:text-stone-200">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <DetailSection label="Path">
                  <p className="font-mono text-sm text-stone-300 break-all">{project.path}</p>
                </DetailSection>

                <DetailSection label="Type">
                  <p className="text-stone-300">{project.type}</p>
                </DetailSection>

                {project.tags.length > 0 && (
                  <DetailSection label="Tags">
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-stone-800 text-stone-300 rounded-md text-xs border border-stone-700/50">{tag}</span>
                      ))}
                    </div>
                  </DetailSection>
                )}

                <DetailSection label="Git Status">
                  <GitStatusBadge git={project.git} />
                  {project.git.isRepo && (
                    <div className="mt-2 text-xs text-stone-400 space-y-1">
                      {project.git.modified.length > 0 && <p>Modified: {project.git.modified.join(', ')}</p>}
                      {project.git.added.length > 0 && <p>Added: {project.git.added.join(', ')}</p>}
                      {project.git.untracked.length > 0 && <p>Untracked: {project.git.untracked.join(', ')}</p>}
                      {project.git.ahead > 0 && <p className="text-amber-400">{project.git.ahead} commits ahead of remote</p>}
                      {project.git.behind > 0 && <p className="text-amber-400">{project.git.behind} commits behind remote</p>}
                    </div>
                  )}
                </DetailSection>

                {project.readme && (
                  <DetailSection label="README">
                    <div className="bg-stone-900 rounded-lg p-4 text-sm text-stone-300 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                      {project.readme}
                    </div>
                  </DetailSection>
                )}

                <div className="flex gap-3 pt-4">
                  {(['vscode', 'terminal', 'folder'] as const).map((action) => {
                    const Icon = action === 'vscode' ? Code2 : action === 'terminal' ? Terminal : Folder
                    const label = action === 'vscode' ? 'VS Code' : action === 'terminal' ? 'Terminal' : 'Folder'
                    return (
                      <button
                        key={action}
                        onClick={() => { onOpenAction(project.id, action); onClose() }}
                        className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-200 px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        <Icon size={16} /> {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">{label}</p>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProjectDetail.tsx
git commit -m "feat: add ProjectDetail slide-out panel"
```

---

### Task 6.3: Create SettingsPanel

**Files:**
- Create: `src/components/SettingsPanel.tsx`

- [ ] **Step 1: Write SettingsPanel**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SettingsPanel.tsx
git commit -m "feat: add SettingsPanel with scan directory management"
```

---

## Chunk 7: Integration — App Refactor, Proxy, Verification

### Task 7.1: Refactor App.tsx to use real API

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Rewrite App.tsx to replace mock data with hooks**

Replace the entire `src/App.tsx` content with:

```typescript
import { useState, useMemo, useCallback } from 'react'
import { executeOpenAction } from './api/client'
import { useProjects } from './hooks/useProjects'
import { useConfig } from './hooks/useConfig'
import { Sidebar } from './components/Sidebar'
import { SearchHeader } from './components/SearchHeader'
import { ProjectGrid } from './components/ProjectGrid'
import { ProjectDetailPanel } from './components/ProjectDetail'
import { SettingsPanel } from './components/SettingsPanel'
import { EmptyState } from './components/EmptyState'
import { SkeletonLoader } from './components/SkeletonLoader'
import type { ProjectDetail, TypeGroup } from './types'

export default function App() {
  const { projects, loading, scanning, error, scan } = useProjects()
  const { config, save: saveConfig } = useConfig()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const filteredProjects = useMemo(() => {
    let result = projects
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.path.toLowerCase().includes(q)
      )
    }
    if (activeCategory !== 'All') {
      result = result.filter(
        (p) => p.type === activeCategory || p.tags.includes(activeCategory)
      )
    }
    return result
  }, [projects, searchQuery, activeCategory])

  const typeGroups = useMemo((): TypeGroup[] => {
    const counts = new Map<string, number>()
    for (const p of projects) counts.set(p.type, (counts.get(p.type) || 0) + 1)
    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
  }, [projects])

  const handleOpenAction = useCallback(async (projectId: string, action: 'vscode' | 'terminal' | 'folder') => {
    setActionError(null)
    try {
      await executeOpenAction(projectId, action)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
    }
  }, [])

  const noScanDirs = config && config.scanDirectories.length === 0
  const noResults = !loading && !scanning && projects.length > 0 && filteredProjects.length === 0
  const isEmpty = !loading && !scanning && projects.length === 0

  return (
    <div className="flex h-screen bg-stone-950 text-stone-300 font-sans overflow-hidden">
      <Sidebar
        typeGroups={typeGroups}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <SearchHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onScan={scan}
          scanning={scanning}
          lastScanTime={config?.lastScanTime || null}
          projectCount={projects.length}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-stone-100 flex items-center gap-2">
              {activeCategory === 'All' ? 'All Projects' : `${activeCategory} Projects`}
              <span className="text-stone-500 text-lg font-normal">({filteredProjects.length})</span>
            </h1>
            <p className="text-stone-400 text-sm mt-1">
              {projects.length > 0
                ? 'Manage and explore your local development workspace.'
                : 'Configure scan directories to discover your projects.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
          )}

          {actionError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex justify-between items-center">
              <span>{actionError}</span>
              <button onClick={() => setActionError(null)} className="text-stone-400 hover:text-stone-200">Dismiss</button>
            </div>
          )}

          {loading && !scanning ? (
            <SkeletonLoader count={6} />
          ) : noScanDirs ? (
            <EmptyState type="no-config" onAction={() => setSettingsOpen(true)} />
          ) : isEmpty ? (
            <EmptyState type="no-projects" />
          ) : noResults ? (
            <EmptyState type="no-results" />
          ) : (
            <ProjectGrid
              projects={filteredProjects}
              onOpenAction={handleOpenAction}
              onProjectClick={setSelectedProject}
            />
          )}
        </main>
      </div>

      <ProjectDetailPanel
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onOpenAction={handleOpenAction}
      />

      <SettingsPanel
        open={settingsOpen}
        config={config}
        onClose={() => setSettingsOpen(false)}
        onSave={saveConfig}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: connect App to real API, replace mock data with hooks"
```

---

### Task 7.2: Configure Vite proxy

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Add proxy to vite.config.ts**

In `vite.config.ts`, change the `server` block to include proxy:

```typescript
server: {
  hmr: process.env.DISABLE_HMR !== 'true',
  watch: process.env.DISABLE_HMR === 'true' ? null : {},
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:3001',
      changeOrigin: true,
    },
  },
},
```

- [ ] **Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "feat: add Vite proxy for /api to backend"
```

---

### Task 7.3: End-to-end verification

- [ ] **Step 1: Install dependencies**

Run: `npm install`

- [ ] **Step 2: TypeScript check all files**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Start backend and test API**

```bash
npx tsx server/index.ts &
sleep 2
curl -s http://127.0.0.1:3001/api/config
curl -s http://127.0.0.1:3001/api/projects
kill %1
```
Expected: Both return valid JSON with `success: true`

- [ ] **Step 4: Start frontend dev server**

```bash
npm run dev &
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
kill %1
```
Expected: `200`

- [ ] **Step 5: Final commit**

```bash
git status
git add -A
git commit -m "chore: final integration verification and cleanup"
```

---

## Running the App

### Development

```bash
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev
```

Open `http://localhost:3000`, configure scan directories in Settings, click "Scan Now".

### Production

```bash
npm run build:all
node dist-server/server.js
```

Open `http://localhost:3000`.

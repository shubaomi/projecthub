// server/services/scanner.ts
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { readConfig, writeConfig, expandHomeDir } from './config.js'
import { applyCategoryUpdates } from './categories.js'
import { Project, ProjectList, ScanResult } from '../types.js'

const PROJECTS_PATH = path.join(
  os.homedir(),
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
      // Preserve custom category across re-scans
      existingProject.customCategory = existingProject.customCategory ?? null
      existingMap.set(project.path, existingProject)
    } else {
      added++
      existingMap.set(project.path, {
        ...project,
        id: generateId(project.path),
        firstSeen: now,
        lastScanned: now,
        customCategory: null,
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
            customCategory: null,
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

export function updateProjectCategory(projectId: string, customCategory: string | null): Project | null {
  return updateProjectCategories([projectId], customCategory)?.[0] ?? null
}

export function updateProjectCategories(projectIds: string[], customCategory: string | null): Project[] | null {
  const projects = loadProjectCache()
  const updated = applyCategoryUpdates(projects, projectIds, customCategory)
  if (!updated) return null

  saveProjectCache(updated)
  const selectedIds = new Set(projectIds)
  return updated.filter((project) => selectedIds.has(project.id))
}

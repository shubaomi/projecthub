// server/routes/api.ts
import { Router, Request, Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { scan, loadProjects, getProjectById, updateProjectCategory } from '../services/scanner.js'
import { getGitStatus } from '../services/git.js'
import { executeAction } from '../services/actions.js'
import { detectIdes } from '../services/ides.js'
import { readConfig, writeConfig } from '../services/config.js'
import { ApiResponse, ProjectDetail, OpenAction, AppConfig, CategoryDefinition } from '../types.js'

const router = Router()

export function createApiRouter(): Router {
  router.get('/projects', (_req: Request, res: Response) => {
    try {
      const projects = loadProjects()
      const withDetails = projects.map((p) => {
        const readme = readReadmeExcerpt(p.path, 200)
        let lastModified = ''
        try { lastModified = fs.statSync(p.path).mtime.toISOString() } catch { /* stale */ }
        return { ...p, readme, lastModified }
      })

      const response: ApiResponse<ProjectDetail[]> = { success: true, data: withDetails }
      res.json(response)
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
      res.status(500).json(response)
    }
  })

  router.get('/projects/:id', (req: Request, res: Response) => {
    try {
      const project = getProjectById(req.params.id)
      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found' })
        return
      }
      const detail: ProjectDetail = {
        ...project,
        git: getGitStatus(project.path),
        readme: readReadmeFull(project.path),
        lastModified: (() => { try { return fs.statSync(project.path).mtime.toISOString() } catch { return '' } })(),
      }
      res.json({ success: true, data: detail } as ApiResponse<ProjectDetail>)
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse<null>)
    }
  })

  router.get('/projects/:id/git', (req: Request, res: Response) => {
    try {
      const project = getProjectById(req.params.id)
      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found' } as ApiResponse<null>)
        return
      }
      const git = getGitStatus(project.path)
      res.json({ success: true, data: git } as ApiResponse<typeof git>)
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse<null>)
    }
  })

  router.post('/scan', async (_req: Request, res: Response) => {
    try {
      const result = scan()
      res.json({ success: true, data: result } as ApiResponse<typeof result>)
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse<null>)
    }
  })

  router.get('/config', (_req: Request, res: Response) => {
    try {
      const config = readConfig()
      res.json({ success: true, data: config } as ApiResponse<typeof config>)
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse<null>)
    }
  })

  router.put('/config', (req: Request, res: Response) => {
    try {
      const config = readConfig()
      const updates = validateConfigUpdate(req.body)
      const updated = { ...config, ...updates }
      writeConfig(updated)
      res.json({ success: true, data: updated } as ApiResponse<typeof updated>)
    } catch (error) {
      const isValidationError = error instanceof Error && error.name === 'ValidationError'
      res.status(isValidationError ? 400 : 500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse<null>)
    }
  })

  router.patch('/projects/:id/category', (req: Request, res: Response) => {
    try {
      const { customCategory } = req.body
      if (customCategory !== null && typeof customCategory !== 'string') {
        res.status(400).json({ success: false, error: 'customCategory must be a string or null' } as ApiResponse<null>)
        return
      }
      const updated = updateProjectCategory(req.params.id, customCategory || null)
      if (!updated) {
        res.status(404).json({ success: false, error: 'Project not found' } as ApiResponse<null>)
        return
      }
      res.json({ success: true, data: updated } as ApiResponse<typeof updated>)
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse<null>)
    }
  })

  router.post('/open', async (req: Request, res: Response) => {
    try {
      const { projectId, action } = req.body
      if (!projectId || !action) {
        res.status(400).json({ success: false, error: 'Missing projectId or action' } as ApiResponse<null>)
        return
      }

      const STANDARD_ACTIONS = ['vscode', 'terminal', 'folder']
      const ides = await detectIdes()
      const allAllowed = new Set([...STANDARD_ACTIONS, ...ides.map(i => i.command)])

      if (!allAllowed.has(action)) {
        res.status(400).json({ success: false, error: `Invalid action: ${action}` } as ApiResponse<null>)
        return
      }

      const msg = await executeAction(projectId, action as OpenAction)
      res.json({ success: true, data: { message: msg } } as ApiResponse<{ message: string }>)
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse<null>)
    }
  })

  router.get('/ides', async (_req: Request, res: Response) => {
    try {
      const ides = await detectIdes()
      res.json({ success: true, data: ides } as ApiResponse<typeof ides>)
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse<null>)
    }
  })

  return router
}

function readReadmeExcerpt(projectPath: string, maxLen: number): string | null {
  const readmePath = findReadme(projectPath)
  if (!readmePath) return null
  try { return fs.readFileSync(readmePath, 'utf-8').slice(0, maxLen) } catch { return null }
}

function readReadmeFull(projectPath: string): string | null {
  const readmePath = findReadme(projectPath)
  if (!readmePath) return null
  try { return fs.readFileSync(readmePath, 'utf-8') } catch { return null }
}

function findReadme(projectPath: string): string | null {
  const candidates = ['README.md', 'readme.md', 'Readme.md', 'README.MD']
  for (const name of candidates) {
    const p = path.join(projectPath, name)
    if (fs.existsSync(p)) return p
  }
  return null
}

function validationError(message: string): Error {
  const error = new Error(message)
  error.name = 'ValidationError'
  return error
}

function validateStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw validationError(`${field} must be an array of strings`)
  }
  return value.map((item) => item.trim()).filter(Boolean)
}

function validateCategory(value: unknown): CategoryDefinition {
  if (!value || typeof value !== 'object') {
    throw validationError('customCategories must contain objects')
  }

  const category = value as Partial<CategoryDefinition>
  if (typeof category.id !== 'string' || !category.id.trim() || category.id.length > 80) {
    throw validationError('category id must be a non-empty string up to 80 characters')
  }
  if (typeof category.name !== 'string' || !category.name.trim() || category.name.length > 80) {
    throw validationError('category name must be a non-empty string up to 80 characters')
  }
  if (typeof category.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(category.color)) {
    throw validationError('category color must be a hex color like #f97316')
  }

  return {
    id: category.id.trim(),
    name: category.name.trim(),
    color: category.color,
  }
}

function validateConfigUpdate(body: unknown): Partial<AppConfig> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw validationError('Request body must be an object')
  }

  const input = body as Partial<Record<keyof AppConfig, unknown>>
  const update: Partial<AppConfig> = {}

  if ('scanDirectories' in input) {
    update.scanDirectories = validateStringArray(input.scanDirectories, 'scanDirectories')
  }

  if ('scanDepth' in input) {
    if (!Number.isInteger(input.scanDepth) || (input.scanDepth as number) < 1 || (input.scanDepth as number) > 8) {
      throw validationError('scanDepth must be an integer between 1 and 8')
    }
    update.scanDepth = input.scanDepth as number
  }

  if ('excludePatterns' in input) {
    update.excludePatterns = validateStringArray(input.excludePatterns, 'excludePatterns')
  }

  if ('lastScanTime' in input) {
    if (input.lastScanTime !== null && typeof input.lastScanTime !== 'string') {
      throw validationError('lastScanTime must be a string or null')
    }
    update.lastScanTime = input.lastScanTime as string | null
  }

  if ('customCategories' in input) {
    if (!Array.isArray(input.customCategories)) {
      throw validationError('customCategories must be an array')
    }
    update.customCategories = input.customCategories.map(validateCategory)
  }

  if ('preferredIde' in input) {
    if (input.preferredIde !== null && typeof input.preferredIde !== 'string') {
      throw validationError('preferredIde must be a string or null')
    }
    update.preferredIde = input.preferredIde as string | null
  }

  if ('language' in input) {
    if (input.language !== 'en' && input.language !== 'zh') {
      throw validationError('language must be en or zh')
    }
    update.language = input.language
  }

  return update
}

// server/routes/api.ts
import { Router, Request, Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { scan, loadProjects, getProjectById, updateProjectCategory } from '../services/scanner.js'
import { getGitStatus } from '../services/git.js'
import { executeAction } from '../services/actions.js'
import { detectIdes } from '../services/ides.js'
import { readConfig, writeConfig } from '../services/config.js'
import { ApiResponse, ProjectDetail, OpenAction } from '../types.js'

const router = Router()

export function createApiRouter(): Router {
  router.get('/projects', (_req: Request, res: Response) => {
    try {
      const projects = loadProjects()
      const search = (_req.query.search as string || '').toLowerCase()
      const type = _req.query.type as string | undefined
      const tag = _req.query.tag as string | undefined

      let filtered = projects
      if (search) {
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(search) ||
            p.tags.some((t) => t.toLowerCase().includes(search)) ||
            p.path.toLowerCase().includes(search)
        )
      }
      if (type) filtered = filtered.filter((p) => p.type === type)
      if (tag) filtered = filtered.filter((p) => p.tags.includes(tag))

      const withDetails = filtered.map((p) => {
        const readme = readReadmeExcerpt(p.path, 200)
        const git = getGitStatus(p.path)
        let lastModified = ''
        try { const stat = fs.statSync(p.path); lastModified = stat.mtime.toISOString() } catch { /* stale */ }
        return { ...p, git, readme, lastModified }
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
      const updated = { ...config, ...req.body }
      writeConfig(updated)
      res.json({ success: true, data: updated } as ApiResponse<typeof updated>)
    } catch (error) {
      res.status(500).json({
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
      const isIdeAction = !STANDARD_ACTIONS.includes(action)
      if (STANDARD_ACTIONS.includes(action) || isIdeAction) {
        const msg = await executeAction(projectId, action as OpenAction)
        res.json({ success: true, data: { message: msg } } as ApiResponse<{ message: string }>)
      } else {
        res.status(400).json({
          success: false,
          error: `Invalid action: ${action}`,
        } as ApiResponse<null>)
      }
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

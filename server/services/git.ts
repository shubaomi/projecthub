// server/services/git.ts
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { GitStatus } from '../types.js'

const EMPTY_STATUS: GitStatus = {
  branch: '',
  allBranches: [],
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
    const branchOutput = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: projectPath,
      timeout: 5000,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()

    if (!branchOutput || branchOutput === 'HEAD') {
      return { ...EMPTY_STATUS, isRepo: true, branch: 'HEAD (detached)' }
    }

    const status: GitStatus = {
      branch: branchOutput,
      allBranches: [],
      ahead: 0,
      behind: 0,
      modified: [],
      added: [],
      deleted: [],
      untracked: [],
      isRepo: true,
    }

    // Fetch all local branches
    try {
      const branchListOutput = execFileSync('git', ['branch', '--format=%(refname:short)'], {
        cwd: projectPath,
        timeout: 5000,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim()
      if (branchListOutput) {
        status.allBranches = branchListOutput.split('\n').filter(Boolean)
      }
    } catch {
      // ignore branch list errors
    }

    const porcelain = execFileSync('git', ['status', '--porcelain', '-b'], {
      cwd: projectPath,
      timeout: 5000,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
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

// server/services/actions.ts
import { execFile } from 'node:child_process'
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
    let args: string[] = []
    let shellCmd: string | undefined

    switch (action) {
      case 'vscode':
        if (platform === 'win32') {
          shellCmd = 'code.cmd'
          args = [projectPath]
        } else {
          shellCmd = 'code'
          args = [projectPath]
        }
        break
      case 'terminal':
        if (platform === 'win32') {
          shellCmd = 'wt.exe'
          args = ['-d', projectPath]
        } else if (platform === 'darwin') {
          shellCmd = 'open'
          args = ['-a', 'Terminal', projectPath]
        } else {
          shellCmd = 'gnome-terminal'
          args = ['--working-directory=' + projectPath]
        }
        break
      case 'folder':
        if (platform === 'win32') {
          shellCmd = 'explorer.exe'
          args = [projectPath]
        } else if (platform === 'darwin') {
          shellCmd = 'open'
          args = [projectPath]
        } else {
          shellCmd = 'xdg-open'
          args = [projectPath]
        }
        break
      default:
        reject(new Error(`Unknown action: ${action}`))
        return
    }

    execFile(shellCmd!, args, (error) => {
      if (error) {
        reject(new Error(`Failed to execute ${action}: ${error.message}`))
      } else {
        resolve(`Executed ${action} for ${project.name}`)
      }
    })
  })
}

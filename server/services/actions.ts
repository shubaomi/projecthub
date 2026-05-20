// server/services/actions.ts
import { execFile, spawn } from 'node:child_process'
import { platform } from 'node:os'
import { OpenAction } from '../types.js'
import { getProjectById } from './scanner.js'

const osPlatform = platform()

export function executeAction(projectId: string, action: OpenAction): Promise<string> {
  const project = getProjectById(projectId)
  if (!project) {
    return Promise.reject(new Error(`Project not found: ${projectId}`))
  }

  const projectPath = project.path

  // Handle IDE actions dynamically (any action not in the standard set)
  if (action !== 'vscode' && action !== 'terminal' && action !== 'folder') {
    return new Promise((resolve, reject) => {
      if (osPlatform === 'win32') {
        // Windows: CLI command or .exe launcher
        const isExeLauncher = action.startsWith('start')
        const cmd = 'cmd.exe'
        const args = isExeLauncher
          ? ['/c', action, projectPath]
          : ['/c', action, projectPath]
        execFile(cmd, args, (error) => {
          if (error) {
            const friendlyMessage = error.code === 'ENOENT'
              ? `${action} not found — check if it is installed and in PATH`
              : `Failed to execute ${action}: the application could not be launched`
            reject(new Error(friendlyMessage))
          } else {
            resolve(`Executed ${action} for ${project.name}`)
          }
        })
      } else {
        // macOS / Linux
        execFile('open', ['-a', action, projectPath], (error) => {
          if (error) {
            reject(new Error(`${action} not found — check if it is installed`))
          } else {
            resolve(`Opened ${action} for ${project.name}`)
          }
        })
      }
    })
  }

  return new Promise((resolve, reject) => {
    let args: string[] = []
    let shellCmd: string | undefined

    switch (action) {
      case 'vscode':
        if (osPlatform === 'win32') {
          shellCmd = 'cmd.exe'
          args = ['/c', 'code', projectPath]
        } else {
          shellCmd = 'code'
          args = [projectPath]
        }
        break
      case 'terminal':
        if (osPlatform === 'win32') {
          shellCmd = 'wt.exe'
          args = ['-w', '0', 'new-tab', '-d', projectPath]
        } else if (osPlatform === 'darwin') {
          shellCmd = 'open'
          args = ['-a', 'Terminal', projectPath]
        } else {
          shellCmd = 'gnome-terminal'
          args = ['--working-directory=' + projectPath]
        }
        break
      case 'folder':
        if (osPlatform === 'win32') {
          spawn('explorer.exe', [projectPath], {
            detached: true,
            stdio: 'ignore'
          }).unref()
          resolve(`Opened folder for ${project.name}`)
          return
        } else if (osPlatform === 'darwin') {
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
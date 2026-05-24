// server/services/actions.ts
import { execFile, spawn } from 'node:child_process'
import { platform } from 'node:os'
import { OpenAction } from '../types.js'
import { getProjectById } from './scanner.js'

const osPlatform = platform()
const POWERSHELL_START = [
  '-NoProfile',
  '-NonInteractive',
  '-ExecutionPolicy',
  'Bypass',
  '-Command',
  '$file=$args[0]; $arguments=@(); if ($args.Length -gt 1) { $arguments=$args[1..($args.Length-1)] }; Start-Process -FilePath $file -ArgumentList $arguments',
]

function launchCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const childCommand = osPlatform === 'win32' ? 'powershell.exe' : command
    const childArgs = osPlatform === 'win32' ? [...POWERSHELL_START, command, ...args] : args

    execFile(childCommand, childArgs, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

export function executeAction(projectId: string, action: OpenAction): Promise<string> {
  const project = getProjectById(projectId)
  if (!project) {
    return Promise.reject(new Error(`Project not found: ${projectId}`))
  }

  const projectPath = project.path

  // Handle IDE actions dynamically (any action not in the standard set)
  if (action !== 'vscode' && action !== 'terminal' && action !== 'folder') {
    const launcher = osPlatform === 'darwin' ? 'open' : action
    const args = osPlatform === 'darwin' ? ['-a', action, projectPath] : [projectPath]

    return launchCommand(launcher, args)
      .then(() => `Executed ${action} for ${project.name}`)
      .catch(() => {
        throw new Error(`${action} not found or could not be launched`)
    })
  }

  return new Promise((resolve, reject) => {
    let args: string[] = []
    let shellCmd: string | undefined

    switch (action) {
      case 'vscode':
        if (osPlatform === 'win32') {
          shellCmd = 'code'
          args = [projectPath]
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

    launchCommand(shellCmd!, args)
      .then(() => resolve(`Executed ${action} for ${project.name}`))
      .catch((error) => reject(new Error(`Failed to execute ${action}: ${error.message}`)))
  })
}

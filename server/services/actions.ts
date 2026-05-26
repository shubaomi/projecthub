// server/services/actions.ts
import { execFile, spawn } from 'node:child_process'
import { platform } from 'node:os'
import { OpenAction } from '../types.js'
import { getProjectById } from './scanner.js'

const osPlatform = platform()

function exec(command: string, args: string[], options?: { windowsVerbatimArguments?: boolean }): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(command, args, options || {}, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

function quoteCmdArg(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function resolveWindowsCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('where.exe', [command], { encoding: 'utf-8' }, (error, stdout) => {
      if (error) {
        reject(error)
        return
      }

      const candidates = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      const preferred = candidates.find((candidate) => /\.(exe|cmd|bat)$/i.test(candidate)) || candidates[0]
      if (!preferred) reject(new Error(`${command} not found`))
      else resolve(preferred)
    })
  })
}

async function launchWindowsCommand(command: string, args: string[]): Promise<void> {
  const launcher = await resolveWindowsCommand(command)

  if (/\.(cmd|bat)$/i.test(launcher)) {
    const commandLine = ['call', quoteCmdArg(launcher), ...args.map(quoteCmdArg)].join(' ')
    await exec('cmd.exe', ['/d', '/c', commandLine], { windowsVerbatimArguments: true })
    return
  }

  await exec(launcher, args)
}

function launchCommand(command: string, args: string[]): Promise<void> {
  if (osPlatform === 'win32') {
    return launchWindowsCommand(command, args)
  }

  return exec(command, args)
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

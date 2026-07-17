// scripts/start.js - Core startup logic for ProjectHub
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const FRONTEND_PORT = 13000
const BACKEND_PORT = 13001

async function checkBuild() {
  const distExists = existsSync(resolve(ROOT, 'dist'))
  return distExists
}

async function runBuild() {
  console.log('Building ProjectHub...')
  const { code } = await runCommand('npm', ['run', 'build:all'], { cwd: ROOT })
  if (code !== 0) {
    throw new Error('Build failed')
  }
}

function runCommand(cmd, args, options) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      ...options,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    })
    child.on('close', (code) => resolve({ code }))
  })
}

async function main() {
  const needsBuild = !(await checkBuild())
  if (needsBuild) {
    await runBuild()
  }

  // Start backend
  const quietEnv = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }
  const backendEnv = { ...quietEnv, PORT: String(BACKEND_PORT) }
  const backend = spawn('npm', ['run', 'start'], {
    cwd: ROOT,
    env: backendEnv,
    stdio: 'pipe',
    shell: process.platform === 'win32'
  })
  backend.stdout.on('data', (data) => process.stdout.write(data))
  backend.stderr.on('data', (data) => process.stderr.write(data))

  // Start frontend dev server
  const frontend = spawn('npm', ['run', 'dev:frontend', '--', '--port', String(FRONTEND_PORT)], {
    cwd: ROOT,
    env: quietEnv,
    stdio: 'pipe',
    shell: process.platform === 'win32'
  })
  frontend.stdout.on('data', (data) => process.stdout.write(data))
  frontend.stderr.on('data', (data) => process.stderr.write(data))

  console.log(`\nProjectHub starting...`)
  console.log(`Frontend: http://localhost:${FRONTEND_PORT}`)
  console.log(`Backend:  http://localhost:${BACKEND_PORT}`)

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...')
    backend.kill()
    frontend.kill()
    process.exit(0)
  })
}

main().catch((err) => {
  console.error('Failed to start:', err)
  process.exit(1)
})

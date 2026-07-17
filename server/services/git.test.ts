import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

test('invalid git metadata degrades quietly without stderr output', async () => {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), 'projecthub-invalid-git-'))
  await mkdir(path.join(projectPath, '.git'))

  try {
    const moduleUrl = pathToFileURL(path.resolve('server/services/git.ts')).href
    const script = [
      `import { getGitStatus } from ${JSON.stringify(moduleUrl)}`,
      `console.log(JSON.stringify(getGitStatus(${JSON.stringify(projectPath)})))`,
    ].join(';')
    const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', script], {
      cwd: process.cwd(),
      encoding: 'utf-8',
    })

    assert.equal(result.status, 0)
    assert.equal(result.stderr, '')
    assert.equal(JSON.parse(result.stdout).isRepo, false)
  } finally {
    await rm(projectPath, { recursive: true, force: true })
  }
})

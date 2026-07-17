import assert from 'node:assert/strict'
import test from 'node:test'
import type { ProjectDetail } from '../types.js'
import { isProjectUncategorized, patchProjectCategories } from './projectCategories.js'

function project(id: string, customCategory: string | null): ProjectDetail {
  return {
    id,
    name: id,
    path: `E:\\Projects\\${id}`,
    type: 'React',
    projectFile: 'package.json',
    tags: ['React'],
    customCategory,
    firstSeen: '',
    lastScanned: '',
    git: null,
    readme: null,
    lastModified: '',
  }
}

test('treats missing and orphaned category ids as uncategorized', () => {
  const validCategoryIds = new Set(['work'])

  assert.equal(isProjectUncategorized(project('a', null), validCategoryIds), true)
  assert.equal(isProjectUncategorized(project('b', 'deleted'), validCategoryIds), true)
  assert.equal(isProjectUncategorized(project('c', 'work'), validCategoryIds), false)
})

test('patches only selected projects without mutating the input', () => {
  const projects = [project('a', null), project('b', null), project('c', 'old')]

  const next = patchProjectCategories(projects, ['a', 'c'], 'work')

  assert.notEqual(next, projects)
  assert.deepEqual(next.map((item) => item.customCategory), ['work', null, 'work'])
  assert.deepEqual(projects.map((item) => item.customCategory), [null, null, 'old'])
  assert.equal(next[1], projects[1])
})

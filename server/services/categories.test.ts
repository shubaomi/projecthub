import assert from 'node:assert/strict'
import test from 'node:test'
import type { Project } from '../types.js'
import { applyCategoryUpdates } from './categories.js'

function project(id: string, customCategory: string | null = null): Project {
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
  }
}

test('applies a category to every selected project in one immutable update', () => {
  const projects = [project('a'), project('b'), project('c', 'old')]

  const next = applyCategoryUpdates(projects, ['a', 'c'], 'work')

  assert.ok(next)
  assert.deepEqual(next.map((item) => item.customCategory), ['work', null, 'work'])
  assert.deepEqual(projects.map((item) => item.customCategory), [null, null, 'old'])
})

test('returns null rather than partially updating unknown project ids', () => {
  const projects = [project('a'), project('b')]

  assert.equal(applyCategoryUpdates(projects, ['a', 'missing'], 'work'), null)
  assert.deepEqual(projects.map((item) => item.customCategory), [null, null])
})

test('deduplicates repeated project ids', () => {
  const projects = [project('a'), project('b')]

  const next = applyCategoryUpdates(projects, ['a', 'a'], 'work')

  assert.ok(next)
  assert.deepEqual(next.map((item) => item.customCategory), ['work', null])
})

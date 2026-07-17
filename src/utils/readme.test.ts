import assert from 'node:assert/strict'
import test from 'node:test'
import { getReadableReadmeExcerpt } from './readme.js'

test('uses the first readable paragraph and removes common markdown noise', () => {
  const readme = [
    '# ProjectHub',
    '',
    '![Banner](https://example.com/banner.png)',
    '',
    'ProjectHub is **local-first** and [fast](https://example.com).',
    '',
    '## Setup',
  ].join('\n')

  assert.equal(getReadableReadmeExcerpt(readme), 'ProjectHub is local-first and fast.')
})

test('returns null for markdown without readable prose', () => {
  assert.equal(getReadableReadmeExcerpt('# Title\n\n```bash\nnpm run dev\n```'), null)
})

test('removes an incomplete markdown link left by server-side truncation', () => {
  assert.equal(
    getReadableReadmeExcerpt('Read the [setup docs](https://example.co'),
    'Read the setup docs',
  )
})

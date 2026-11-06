import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatMemoryDate } from './date.ts'
import { createPrivateSlug } from './slug.ts'
import { youtubeVideoId } from './youtube.ts'

describe('youtubeVideoId', () => {
  it('reads the common YouTube link shapes', () => {
    assert.equal(youtubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
    assert.equal(youtubeVideoId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
    assert.equal(youtubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
    assert.equal(youtubeVideoId('https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=RDAMVM'), 'dQw4w9WgXcQ')
    assert.equal(youtubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
    assert.equal(youtubeVideoId('https://www.youtube.com/live/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
  })

  it('rejects links that are not a single video', () => {
    assert.equal(youtubeVideoId('https://www.youtube.com/playlist?list=abc'), null)
    assert.equal(youtubeVideoId('https://vimeo.com/123456789'), null)
    assert.equal(youtubeVideoId('not a url'), null)
    assert.equal(youtubeVideoId('https://www.youtube.com/watch?v=short'), null)
  })
})

describe('createPrivateSlug', () => {
  it('builds an unguessable lowercase link id', () => {
    const slug = createPrivateSlug()
    assert.match(slug, /^[a-z0-9]{12}$/)
    assert.notEqual(slug, createPrivateSlug())
  })
})

describe('formatMemoryDate', () => {
  it('formats a calendar date in South Africa', () => {
    assert.equal(formatMemoryDate('2026-11-06'), '6 November 2026')
    assert.equal(formatMemoryDate('2026-13-01'), null)
    assert.equal(formatMemoryDate('November 6'), null)
  })
})

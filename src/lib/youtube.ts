const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
])

export function youtubeVideoId(input: string): string | null {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  let id: string | null = null

  if (host === 'youtu.be') {
    id = url.pathname.split('/').filter(Boolean)[0] ?? null
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (url.pathname === '/watch') {
      id = url.searchParams.get('v')
    } else {
      const [kind, value] = url.pathname.split('/').filter(Boolean)
      if ((kind === 'embed' || kind === 'shorts' || kind === 'live') && value) {
        id = value
      }
    }
  }

  if (!id || !VIDEO_ID.test(id)) return null
  return id
}

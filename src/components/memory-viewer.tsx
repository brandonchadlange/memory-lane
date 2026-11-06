'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MemoryBook, MemoryMoment } from '@/sanity/lib/books'

type Stage = 'cover' | 'story' | 'end'

type Player = {
  playVideo: () => void
  pauseVideo: () => void
  destroy: () => void
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          width?: string
          height?: string
          videoId: string
          playerVars?: Record<string, number | string>
          events?: {
            onReady?: (event: { target: Player }) => void
            onError?: () => void
            onStateChange?: (event: { data: number }) => void
          }
        },
      ) => Player
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('The YouTube player did not load')), 8000)
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeout)
      previous?.()
      resolve()
    }
    if (!document.querySelector('script[data-youtube-iframe-api]')) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.dataset.youtubeIframeApi = 'true'
      document.head.appendChild(script)
    }
  })
}

function storyMoment(book: MemoryBook, index: number): MemoryMoment | undefined {
  return book.moments[index]
}

export function MemoryViewer({ book }: { book: MemoryBook }) {
  const [stage, setStage] = useState<Stage>('cover')
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [songError, setSongError] = useState(false)
  const playerRef = useRef<Player | null>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const musicWanted = useRef(true)
  const starting = useRef(false)

  const moment = stage === 'story' ? storyMoment(book, index) : undefined
  const songName = book.soundtrackTitle || 'Song'

  const move = useCallback(
    (direction: 1 | -1) => {
      const last = book.moments.length - 1
      if (direction === 1) {
        if (stage === 'story' && index < last) {
          setIndex(index + 1)
          return
        }
        setStage('end')
        return
      }
      if (stage === 'end') {
        if (last < 0) return
        setIndex(last)
        setStage('story')
        return
      }
      if (stage === 'story' && index > 0) setIndex(index - 1)
    },
    [book.moments.length, index, stage],
  )

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (stage === 'cover') return
      const target = event.target
      if (target instanceof HTMLElement && target.closest('video, input, textarea, iframe')) return
      if (event.key === 'ArrowRight') move(1)
      if (event.key === 'ArrowLeft') move(-1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [move, stage])

  useEffect(() => {
    if (stage === 'cover' || !book.youtubeId || playerRef.current || starting.current) return
    const host = hostRef.current
    if (!host) return
    const videoId = book.youtubeId
    starting.current = true
    let cancelled = false

    loadYouTubeApi()
      .then(() => {
        if (cancelled || !hostRef.current || playerRef.current || !window.YT?.Player) {
          if (!playerRef.current) starting.current = false
          return
        }
        playerRef.current = new window.YT.Player(hostRef.current, {
          width: '240',
          height: '135',
          videoId,
          playerVars: {
            autoplay: 1,
            rel: 0,
            playsinline: 1,
            loop: 1,
            playlist: videoId,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              event.target.playVideo()
              setPaused(false)
            },
            onError: () => setSongError(true),
            onStateChange: (event) => {
              if (event.data === 1) setPaused(false)
              if (event.data === 2) setPaused(true)
            },
          },
        })
      })
      .catch(() => {
        if (!cancelled) setSongError(true)
        starting.current = false
      })

    return () => {
      cancelled = true
      if (!playerRef.current) starting.current = false
    }
  }, [book.youtubeId, stage])

  useEffect(() => {
    return () => {
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [])

  function openMemory() {
    setIndex(0)
    setStage(book.moments.length > 0 ? 'story' : 'end')
  }

  function toggleMusic() {
    const player = playerRef.current
    if (!player) return
    if (paused) {
      musicWanted.current = true
      videoRef.current?.pause()
      player.playVideo()
      return
    }
    musicWanted.current = false
    player.pauseVideo()
  }

  function pauseSongForVideo() {
    playerRef.current?.pauseVideo()
  }

  function resumeSongAfterVideo() {
    if (musicWanted.current) playerRef.current?.playVideo()
  }

  if (stage === 'cover') {
    return (
      <section className="relative min-h-dvh bg-night text-white">
        <Image
          src={book.cover.url}
          alt={book.cover.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
          placeholder={book.cover.lqip ? 'blur' : 'empty'}
          blurDataURL={book.cover.lqip}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/30" />
        <div className="relative z-10 flex min-h-dvh flex-col justify-end px-6 pb-12">
          {book.dateLabel ? <p className="text-sm text-white/80">{book.dateLabel}</p> : null}
          <h1 className="mt-2 max-w-xl font-serif text-5xl leading-none text-balance">{book.title}</h1>
          {book.soundtrackTitle ? <p className="mt-4 text-white/80">With {book.soundtrackTitle}</p> : null}
          <button
            type="button"
            onClick={openMemory}
            className="mt-8 h-12 w-fit rounded-full bg-white px-6 font-medium text-night focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Open this memory
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="flex min-h-dvh flex-col bg-night text-white">
      {stage === 'story' && moment ? (
        <>
          <div className="relative min-h-0 flex-1">
            {moment.kind === 'photo' ? (
              <Image
                src={moment.picture.url}
                alt={moment.picture.alt || moment.caption || book.title}
                fill
                sizes="100vw"
                className="object-contain"
                placeholder={moment.picture.lqip ? 'blur' : 'empty'}
                blurDataURL={moment.picture.lqip}
              />
            ) : (
              <video
                key={moment._key}
                ref={videoRef}
                className="h-full w-full bg-black object-contain"
                controls
                playsInline
                preload="metadata"
                src={moment.videoUrl}
                aria-label={moment.caption || 'Video'}
                onPlay={pauseSongForVideo}
                onPause={resumeSongAfterVideo}
                onEnded={resumeSongAfterVideo}
              />
            )}
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <button type="button" onClick={() => move(-1)} disabled={index === 0} className="h-11 rounded-full border border-white/25 px-4 disabled:opacity-35">
              Previous
            </button>
            <p className="text-center text-sm text-white/75">
              {moment.caption ? <span className="mb-1 block text-white">{moment.caption}</span> : null}
              {index + 1} of {book.moments.length}
            </p>
            <button type="button" onClick={() => move(1)} className="h-11 rounded-full border border-white/25 px-4">
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col justify-center px-6 py-16">
          {book.dateLabel ? <p className="text-sm text-white/70">{book.dateLabel}</p> : null}
          <h1 className="mt-3 max-w-xl font-serif text-5xl leading-none text-balance">{book.title}</h1>
          {book.dedication ? (
            <p className="mt-6 max-w-md whitespace-pre-wrap text-lg leading-relaxed text-white/85">{book.dedication}</p>
          ) : null}
          <div className="mt-10 flex flex-wrap gap-3">
            {book.moments.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setIndex(0)
                  setStage('story')
                }}
                className="h-12 rounded-full bg-white px-6 font-medium text-night"
              >
                Look through it again
              </button>
            ) : null}
            {book.moments.length > 0 ? (
              <button type="button" onClick={() => move(-1)} className="h-11 rounded-full border border-white/25 px-4">
                Previous
              </button>
            ) : null}
          </div>
          <Link href={`/m/${book.slug}/share`} className="mt-8 w-fit text-sm text-white/70 underline-offset-4 hover:underline">
            Share this memory
          </Link>
        </div>
      )}
      {book.youtubeId ? (
        <div className="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm">{songName}</p>
            {songError ? (
              <a
                className="text-sm text-white/70 underline-offset-4 hover:underline"
                href={`https://www.youtube.com/watch?v=${book.youtubeId}`}
                target="_blank"
                rel="noreferrer"
              >
                Open the song on YouTube
              </a>
            ) : (
              <button type="button" onClick={toggleMusic} className="text-sm text-white/70">
                {paused ? 'Play song' : 'Pause song'}
              </button>
            )}
          </div>
          <div ref={hostRef} className="h-[135px] w-[240px] shrink-0 bg-black" />
        </div>
      ) : null}
    </section>
  )
}

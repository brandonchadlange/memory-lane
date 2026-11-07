'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
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

const PHOTO_MS = 5000
const RING_RADIUS = 20
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

function storyMoment(book: MemoryBook, index: number): MemoryMoment | undefined {
  return book.moments[index]
}

function ProgressRing({ remaining }: { remaining: number }) {
  const left = Math.min(1, Math.max(0, remaining))
  return (
    <svg className="pointer-events-none absolute inset-0 size-full -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r={RING_RADIUS} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
      <circle
        cx="22"
        cy="22"
        r={RING_RADIUS}
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={RING_LENGTH}
        strokeDashoffset={RING_LENGTH * (1 - left)}
      />
    </svg>
  )
}

function EdgeButton({
  label,
  direction,
  disabled,
  onClick,
  remaining,
}: {
  label: string
  direction: 'left' | 'right'
  disabled?: boolean
  onClick: () => void
  remaining?: number
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`absolute top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-30 ${remaining === undefined ? 'border border-white/25' : ''} ${direction === 'left' ? 'left-3' : 'right-3'}`}
    >
      {remaining === undefined ? null : <ProgressRing remaining={remaining} />}
      <svg viewBox="0 0 20 20" className={`size-5 ${direction === 'left' ? 'rotate-180' : ''}`} aria-hidden="true">
        <path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function StoryClock({
  moment,
  videoRef,
  onAdvance,
}: {
  moment: MemoryMoment
  videoRef: RefObject<HTMLVideoElement | null>
  onAdvance: () => void
}) {
  const [remaining, setRemaining] = useState(1)
  const advanceRef = useRef(onAdvance)

  useEffect(() => {
    advanceRef.current = onAdvance
  }, [onAdvance])

  useEffect(() => {
    if (moment.kind === 'photo') {
      const started = performance.now()
      let frame = 0
      const tick = (now: number) => {
        const left = Math.max(0, 1 - (now - started) / PHOTO_MS)
        setRemaining(left)
        if (left === 0) {
          advanceRef.current()
          return
        }
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(frame)
    }

    const video = videoRef.current
    if (!video) return
    let frame = 0
    const update = () => {
      const duration = video.duration
      if (Number.isFinite(duration) && duration > 0) {
        setRemaining(Math.max(0, 1 - video.currentTime / duration))
      }
    }
    const tick = () => {
      update()
      if (!video.paused && !video.ended) frame = requestAnimationFrame(tick)
    }
    const start = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(tick)
    }
    video.addEventListener('play', start)
    video.addEventListener('seeked', update)
    video.addEventListener('loadedmetadata', update)
    start()
    return () => {
      cancelAnimationFrame(frame)
      video.removeEventListener('play', start)
      video.removeEventListener('seeked', update)
      video.removeEventListener('loadedmetadata', update)
    }
  }, [moment, videoRef])

  return <EdgeButton label="Next" direction="right" onClick={onAdvance} remaining={remaining} />
}

function Soundtrack({
  songName,
  youtubeId,
  playing,
  songError,
  onToggle,
  hostRef,
}: {
  songName: string
  youtubeId: string
  playing: boolean
  songError: boolean
  onToggle: () => void
  hostRef: RefObject<HTMLDivElement | null>
}) {
  const className = 'absolute right-4 bottom-24 z-30 flex w-28 flex-col items-center gap-1.5 text-white no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'
  const face = (
    <>
      {songError ? <span className="text-center text-[11px] text-white/85 [text-shadow:0_1px_8px_rgb(0_0_0/0.9)]">Open on YouTube</span> : null}
      <span className="line-clamp-2 text-center font-serif text-xs leading-tight [text-shadow:0_1px_8px_rgb(0_0_0/0.9)]">{songName}</span>
      <span className="relative block size-28">
        <span className={`record-grooves${playing ? ' is-playing' : ''}`} />
        <span className="record-label">
          <Image
            src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
            alt=""
            fill
            sizes="72px"
            className="object-cover"
          />
          <span className="record-hole" />
        </span>
      </span>
    </>
  )

  return (
    <>
      {songError ? (
        <a className={className} href={`https://www.youtube.com/watch?v=${youtubeId}`} target="_blank" rel="noreferrer">
          {face}
        </a>
      ) : (
        <button type="button" className={className} onClick={onToggle} aria-pressed={playing} aria-label={playing ? `Pause ${songName}` : `Play ${songName}`}>
          {face}
        </button>
      )}
      {/* YouTube replaces this node with an iframe. Keep a real size so the song can start, and hide the picture. */}
      <div inert aria-hidden="true" className="pointer-events-none absolute top-0 left-0 h-[135px] w-[240px] overflow-hidden opacity-0">
        <div ref={hostRef} />
      </div>
    </>
  )
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
            controls: 0,
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

  useEffect(() => {
    if (stage !== 'story' || moment?.kind !== 'video') return
    const video = videoRef.current
    if (!video) return
    let cancelled = false
    async function start() {
      if (!video) return
      try {
        video.muted = false
        await video.play()
      } catch {
        if (cancelled) return
        video.muted = true
        try {
          await video.play()
        } catch {
          // The visitor can press play. The story waits until the video finishes.
        }
      }
    }
    void start()
    return () => {
      cancelled = true
    }
  }, [stage, moment?._key, moment?.kind])

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

  function resumeSongAfterVideo() {
    if (musicWanted.current) playerRef.current?.playVideo()
  }

  function syncSongWithVideo() {
    const video = videoRef.current
    const videoHasSound = Boolean(video && !video.paused && !video.ended && !video.muted && video.volume > 0)
    if (videoHasSound) {
      playerRef.current?.pauseVideo()
      return
    }
    resumeSongAfterVideo()
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

  const playing = !paused && !songError

  return (
    <section className="relative h-dvh overflow-hidden bg-night text-white">
      {stage === 'story' && moment ? (
        <>
          <div className="absolute inset-0">
            {moment.kind === 'photo' ? (
              <Image
                src={moment.picture.url}
                alt={moment.picture.alt || moment.caption || book.title}
                fill
                sizes="100vw"
                className="object-cover"
                placeholder={moment.picture.lqip ? 'blur' : 'empty'}
                blurDataURL={moment.picture.lqip}
              />
            ) : (
              <video
                key={moment._key}
                ref={videoRef}
                className="h-full w-full bg-black object-cover"
                controls
                playsInline
                preload="metadata"
                src={moment.videoUrl}
                aria-label={moment.caption || 'Video'}
                autoPlay
                onPlay={syncSongWithVideo}
                onPause={syncSongWithVideo}
                onVolumeChange={syncSongWithVideo}
                onEnded={() => {
                  syncSongWithVideo()
                  move(1)
                }}
              />
            )}
          </div>
          <EdgeButton label="Previous" direction="left" disabled={index === 0} onClick={() => move(-1)} />
          <StoryClock key={moment._key} moment={moment} videoRef={videoRef} onAdvance={() => move(1)} />
          {moment.kind === 'photo' ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/55 via-black/15 to-transparent px-5 pt-20 pb-5">
              <div className={book.youtubeId ? 'max-w-[calc(100%-8.5rem)]' : 'max-w-xl'}>
                {moment.caption ? <p className="font-serif text-3xl leading-none text-balance">{moment.caption}</p> : null}
                <p className="mt-2 text-sm text-white/75">
                  {index + 1} of {book.moments.length}
                </p>
              </div>
            </div>
          ) : (
            <div className="pointer-events-none absolute top-4 left-4 z-10 max-w-[46%]">
              {moment.caption ? <p className="font-serif text-2xl leading-none text-balance">{moment.caption}</p> : null}
              <p className="mt-2 text-sm text-white/75">
                {index + 1} of {book.moments.length}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="h-full overflow-y-auto px-6 pt-16 pb-64">
          <div className="flex min-h-full flex-col justify-center">
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
                  className="h-12 rounded-full bg-white px-6 font-medium text-night focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Look through it again
                </button>
              ) : null}
              {book.moments.length > 0 ? (
                <button
                  type="button"
                  onClick={() => move(-1)}
                  className="h-11 rounded-full border border-white/25 px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Previous
                </button>
              ) : null}
            </div>
            <Link href={`/m/${book.slug}/share`} className="mt-8 w-fit text-sm text-white/70 underline-offset-4 hover:underline">
              Share this memory
            </Link>
          </div>
        </div>
      )}
      {book.youtubeId ? (
        <Soundtrack
          songName={songName}
          youtubeId={book.youtubeId}
          playing={playing}
          songError={songError}
          onToggle={toggleMusic}
          hostRef={hostRef}
        />
      ) : null}
    </section>
  )
}

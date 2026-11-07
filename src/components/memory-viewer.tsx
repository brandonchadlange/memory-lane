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

function storyMoment(book: MemoryBook, index: number): MemoryMoment | undefined {
  return book.moments[index]
}

function EdgeButton({
  label,
  direction,
  disabled,
  onClick,
}: {
  label: string
  direction: 'left' | 'right'
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`absolute top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-30 ${direction === 'left' ? 'left-3' : 'right-3'}`}
    >
      <svg viewBox="0 0 20 20" className={`size-5 ${direction === 'left' ? 'rotate-180' : ''}`} aria-hidden="true">
        <path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function Soundtrack({
  songName,
  youtubeId,
  playing,
  songError,
  placement,
  onToggle,
  hostRef,
}: {
  songName: string
  youtubeId: string
  playing: boolean
  songError: boolean
  placement: 'top' | 'bottom'
  onToggle: () => void
  hostRef: RefObject<HTMLDivElement | null>
}) {
  const position = placement === 'top' ? 'top-4 right-4' : 'bottom-4 right-4'
  const className = `absolute z-30 flex w-44 flex-col items-center gap-2 text-white no-underline ${position} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white`
  const face = (
    <>
      <span className="relative block size-44">
        <span className={`record-grooves${playing ? ' is-playing' : ''}`} />
        <span className="record-label">
          <span className="record-hole" />
          <span className="record-title" title={songName}>{songName}</span>
        </span>
      </span>
      {songError ? <span className="text-center text-xs text-white/85 [text-shadow:0_1px_8px_rgb(0_0_0/0.9)]">Open on YouTube</span> : null}
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
                onPlay={pauseSongForVideo}
                onPause={resumeSongAfterVideo}
                onEnded={resumeSongAfterVideo}
              />
            )}
          </div>
          <EdgeButton label="Previous" direction="left" disabled={index === 0} onClick={() => move(-1)} />
          <EdgeButton label="Next" direction="right" onClick={() => move(1)} />
          {moment.kind === 'photo' ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/55 via-black/15 to-transparent px-5 pt-20 pb-5">
              <div className={book.youtubeId ? 'max-w-[calc(100%-13.5rem)]' : 'max-w-xl'}>
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
        <div className="h-full overflow-y-auto px-6 pt-16 pb-48">
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
          placement={moment?.kind === 'video' ? 'top' : 'bottom'}
          onToggle={toggleMusic}
          hostRef={hostRef}
        />
      ) : null}
    </section>
  )
}

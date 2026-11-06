import { stegaClean } from '@sanity/client/stega'
import type { SanityImageSource } from '@sanity/image-url'
import { cache } from 'react'
import { formatMemoryDate } from '@/lib/date'
import { youtubeVideoId } from '@/lib/youtube'
import { client } from './client'
import { urlFor } from './image'
import { MEMORY_BOOK_QUERY, MEMORY_BOOKS_QUERY } from './queries'

export type MemoryPicture = {
  url: string
  alt: string
  lqip?: string
}

export type MemoryMoment =
  | {
      _key: string
      kind: 'photo'
      caption?: string
      picture: MemoryPicture
    }
  | {
      _key: string
      kind: 'video'
      caption?: string
      videoUrl: string
    }

export type MemoryBook = {
  title: string
  slug: string
  dateLabel?: string
  dedication?: string
  soundtrackTitle?: string
  youtubeId?: string
  cover: MemoryPicture
  cardImageUrl: string
  moments: MemoryMoment[]
}

type ImageField = {
  alt?: string | null
  hotspot?: unknown
  crop?: unknown
  asset?: {
    _id?: string | null
    metadata?: { lqip?: string | null } | null
  } | null
} | null

type MomentField = {
  _key?: string | null
  _type?: string | null
  caption?: string | null
  image?: ImageField
  video?: { asset?: { url?: string | null } | null } | null
}

type MemoryBookDocument = {
  _id?: string | null
  title?: string | null
  slug?: string | null
  date?: string | null
  dedication?: string | null
  soundtrackTitle?: string | null
  soundtrackUrl?: string | null
  cover?: ImageField
  moments?: MomentField[] | null
}

function text(value: string | null | undefined): string {
  return stegaClean(value ?? '').trim()
}

function optionalText(value: string | null | undefined): string | undefined {
  const cleaned = text(value)
  return cleaned.length > 0 ? cleaned : undefined
}

function imageSource(image: ImageField): SanityImageSource | null {
  if (!image?.asset?._id) return null
  return image as SanityImageSource
}

function pictureFrom(image: ImageField, width: number, height?: number): MemoryPicture | null {
  const source = imageSource(image)
  if (!source || !image) return null
  const sized = urlFor(source).auto('format').quality(75)
  const url = height ? sized.width(width).height(height).fit('crop').url() : sized.width(width).fit('max').url()
  const lqip = image.asset?.metadata?.lqip ?? undefined
  return {
    url,
    alt: text(image.alt),
    ...(lqip ? { lqip } : {}),
  }
}

function momentFrom(moment: MomentField): MemoryMoment | null {
  const key = text(moment._key)
  if (!key) return null
  const caption = optionalText(moment.caption)

  if (moment._type === 'photoMoment') {
    const picture = pictureFrom(moment.image ?? null, 2000)
    if (!picture) return null
    return { _key: key, kind: 'photo', caption, picture }
  }

  if (moment._type === 'videoMoment') {
    const videoUrl = text(moment.video?.asset?.url)
    if (!videoUrl) return null
    return { _key: key, kind: 'video', caption, videoUrl }
  }

  return null
}

export function toMemoryBook(document: MemoryBookDocument | null): MemoryBook | null {
  if (!document) return null
  const title = text(document.title)
  const slug = text(document.slug)
  const cover = pictureFrom(document.cover ?? null, 1600, 2000)
  const cardSource = imageSource(document.cover ?? null)
  if (!title || !slug || !cover || !cardSource) return null

  const date = text(document.date)
  const soundtrackUrl = text(document.soundtrackUrl)
  const youtubeId = soundtrackUrl ? youtubeVideoId(soundtrackUrl) ?? undefined : undefined

  return {
    title,
    slug,
    dateLabel: date ? formatMemoryDate(date) ?? undefined : undefined,
    dedication: optionalText(document.dedication),
    soundtrackTitle: optionalText(document.soundtrackTitle),
    youtubeId,
    cover: {
      ...cover,
      alt: cover.alt || title,
    },
    cardImageUrl: urlFor(cardSource).width(1200).height(1800).fit('crop').auto('format').quality(80).url(),
    moments: (document.moments ?? []).flatMap((moment) => {
      const mapped = momentFrom(moment)
      return mapped ? [mapped] : []
    }),
  }
}

export type PublishedBook = {
  id: string
  title: string
  slug: string
  dateLabel?: string
  cover?: MemoryPicture
}

export const getMemoryBook = cache(async (slug: string): Promise<MemoryBook | null> => {
  const document = await client.fetch<MemoryBookDocument | null>(MEMORY_BOOK_QUERY, {
    slug: stegaClean(slug),
  })
  return toMemoryBook(document)
})

export const getPublishedBooks = cache(async (): Promise<PublishedBook[]> => {
  const documents = await client.fetch<MemoryBookDocument[] | null>(MEMORY_BOOKS_QUERY)
  return (documents ?? []).flatMap((document) => {
    const title = text(document.title)
    const slug = text(document.slug)
    const id = text(document._id)
    if (!title || !slug || !id) return []
    const date = text(document.date)
    const cover = pictureFrom(document.cover ?? null, 800, 1000)
    return [
      {
        id,
        title,
        slug,
        dateLabel: date ? formatMemoryDate(date) ?? undefined : undefined,
        cover: cover ? { ...cover, alt: cover.alt || title } : undefined,
      },
    ]
  })
})

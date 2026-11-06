import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { MemoryViewer } from '@/components/memory-viewer'
import { getMemoryBook } from '@/sanity/lib/books'

export const viewport: Viewport = {
  themeColor: '#100e0c',
}

export async function generateMetadata(props: PageProps<'/m/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params
  const book = await getMemoryBook(slug)
  if (!book) {
    return { title: 'Memory', robots: { index: false, follow: false } }
  }
  return {
    title: book.title,
    description: book.dedication,
    robots: { index: false, follow: false },
    openGraph: {
      title: book.title,
      description: book.dedication,
      images: [{ url: book.cover.url, alt: book.cover.alt }],
    },
  }
}

export default function Page(props: PageProps<'/m/[slug]'>) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-night" />}>
      <MemoryRoute params={props.params} />
    </Suspense>
  )
}

async function MemoryRoute({ params }: Pick<PageProps<'/m/[slug]'>, 'params'>) {
  const { slug } = await params
  const book = await getMemoryBook(slug)
  if (!book) notFound()
  return <MemoryViewer book={book} />
}

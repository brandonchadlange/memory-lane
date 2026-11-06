import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { Suspense } from 'react'
import { SharePanel } from '@/components/share-panel'
import { requestOrigin } from '@/lib/origin'
import { getMemoryBook } from '@/sanity/lib/books'

export async function generateMetadata(props: PageProps<'/m/[slug]/share'>): Promise<Metadata> {
  const { slug } = await props.params
  const book = await getMemoryBook(slug)
  return {
    title: book ? `Share ${book.title}` : 'Share',
    robots: { index: false, follow: false },
  }
}

export default function Page(props: PageProps<'/m/[slug]/share'>) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-paper" />}>
      <ShareRoute params={props.params} />
    </Suspense>
  )
}

async function ShareRoute({ params }: Pick<PageProps<'/m/[slug]/share'>, 'params'>) {
  const { slug } = await params
  const book = await getMemoryBook(slug)
  if (!book) notFound()
  const pageUrl = `${await requestOrigin()}/m/${book.slug}`
  const qrDataUrl = await QRCode.toDataURL(pageUrl, {
    margin: 1,
    width: 640,
    errorCorrectionLevel: 'H',
    color: { dark: '#1c1916', light: '#ffffff' },
  })
  return <SharePanel book={book} pageUrl={pageUrl} qrDataUrl={qrDataUrl} />
}

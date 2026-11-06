'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef, useState } from 'react'
import type { MemoryBook } from '@/sanity/lib/books'

function wrapLines(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (context.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, 4)
}

async function drawPrint(book: MemoryBook, qrDataUrl: string, fontFamily: string): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 1800
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare the print')

  const photo = new window.Image()
  photo.crossOrigin = 'anonymous'
  photo.src = book.cardImageUrl
  await photo.decode()
  context.drawImage(photo, 0, 0, canvas.width, canvas.height)

  const scrim = context.createLinearGradient(0, 1180, 0, 1800)
  scrim.addColorStop(0, 'rgba(0,0,0,0)')
  scrim.addColorStop(1, 'rgba(0,0,0,0.72)')
  context.fillStyle = scrim
  context.fillRect(0, 1180, canvas.width, 620)

  const qrSize = 280
  const margin = 64
  const box = qrSize + 36
  const boxX = canvas.width - margin - box
  const boxY = canvas.height - margin - box
  context.fillStyle = '#ffffff'
  context.beginPath()
  context.roundRect(boxX, boxY, box, box, 24)
  context.fill()

  const qr = new window.Image()
  qr.src = qrDataUrl
  await qr.decode()
  context.drawImage(qr, boxX + 18, boxY + 18, qrSize, qrSize)

  context.fillStyle = '#ffffff'
  context.font = `64px ${fontFamily}`
  const lines = wrapLines(context, book.title, boxX - margin * 2)
  lines.forEach((line, lineIndex) => {
    context.fillText(line, margin, 1560 + lineIndex * 76 - (lines.length - 1) * 76)
  })
  if (book.dateLabel) {
    context.font = `28px ${fontFamily}`
    context.fillText(book.dateLabel, margin, 1560 - lines.length * 76 - 12)
  }

  return canvas.toDataURL('image/png')
}

export function SharePanel({ book, pageUrl, qrDataUrl }: { book: MemoryBook; pageUrl: string; qrDataUrl: string }) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [copied, setCopied] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)

  function copyLink() {
    const input = document.getElementById('memory-link')
    if (input instanceof HTMLInputElement) {
      input.focus()
      input.select()
      input.setSelectionRange(0, input.value.length)
    }

    let didCopy = false
    try {
      didCopy = document.execCommand('copy')
    } catch {
      didCopy = false
    }

    const showCopied = () => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }

    if (didCopy) {
      showCopied()
      return
    }

    void navigator.clipboard?.writeText(pageUrl).then(showCopied).catch(() => {})
  }

  async function downloadQr() {
    const response = await fetch(qrDataUrl)
    const blob = await response.blob()
    downloadBlob(blob, `${book.slug}-qr.png`)
  }

  async function downloadPrint(fontFamily: string) {
    try {
      const dataUrl = await drawPrint(book, qrDataUrl, fontFamily)
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      downloadBlob(blob, `${book.slug}-print.png`)
      setCardError(null)
    } catch {
      setCardError('The print could not be prepared. The QR code is still ready to download.')
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-10 px-6 py-12">
      <div>
        <p className="text-sm text-muted">Share</p>
        <h1 ref={titleRef} className="mt-2 font-serif text-5xl leading-none text-balance">{book.title}</h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
          This page is what opens when the code is scanned. Publish the book in the studio before you print it.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_16rem] md:items-start">
        <div className="flex flex-col gap-4">
          <label className="text-sm text-muted" htmlFor="memory-link">
            Private link
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="memory-link"
              readOnly
              value={pageUrl}
              className="h-12 min-w-0 flex-1 rounded-full border border-line bg-white px-4"
              onFocus={(event) => event.currentTarget.select()}
            />
            <button type="button" onClick={copyLink} className="h-12 rounded-full bg-ink px-5 text-paper">
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={downloadQr} className="h-11 rounded-full border border-line px-4">
              Download QR code
            </button>
            <button
              type="button"
              onClick={() => {
                const family = titleRef.current ? window.getComputedStyle(titleRef.current).fontFamily : 'serif'
                void downloadPrint(family)
              }}
              className="h-11 rounded-full border border-line px-4"
            >
              Download print
            </button>
          </div>
          {cardError ? <p className="text-sm text-muted">{cardError}</p> : null}
          <Link href={`/m/${book.slug}`} className="w-fit text-sm underline-offset-4 hover:underline">
            Open the memory
          </Link>
        </div>
        <Image src={qrDataUrl} alt={`QR code for ${book.title}`} width={640} height={640} unoptimized className="w-full bg-white p-3" />
      </div>

      <figure className="max-w-sm">
        <div className="relative aspect-[2/3] overflow-hidden bg-night">
          <Image src={book.cardImageUrl} alt="" fill sizes="24rem" className="object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 pr-28 text-white">
            {book.dateLabel ? <p className="text-xs text-white/80">{book.dateLabel}</p> : null}
            <figcaption className="font-serif text-3xl leading-none">{book.title}</figcaption>
          </div>
          <Image src={qrDataUrl} alt="" width={256} height={256} unoptimized className="absolute right-4 bottom-4 w-24 bg-white p-1" />
        </div>
        <p className="mt-3 text-sm text-muted">The print is a 4 by 6 inch image at 300 pixels per inch.</p>
      </figure>
    </main>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Memory Lane',
}

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-sm text-muted">Memory Lane</p>
      <h1 className="mt-3 font-serif text-5xl leading-none text-balance">A book you can open with a code.</h1>
      <p className="mt-6 text-lg leading-relaxed text-muted">
        Add the pictures, a short video, and a YouTube song. Publish the book, then print the code onto a photograph.
        Whoever scans it gets the memory.
      </p>
      <Link
        href="/studio"
        className="mt-10 inline-flex h-12 w-fit items-center rounded-full bg-ink px-6 text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Open the studio
      </Link>
    </main>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { BookList } from '@/components/book-list'

export const metadata: Metadata = {
  title: 'Memory Lane',
}

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-6 py-16">
      <p className="text-sm text-muted">Memory Lane</p>
      <h1 className="mt-3 font-serif text-5xl leading-none text-balance">Your books</h1>
      <Suspense fallback={<p className="mt-10 text-lg text-muted">Loading books…</p>}>
        <BookList />
      </Suspense>
      <Link
        href="/studio"
        className="mt-10 inline-flex h-12 w-fit items-center rounded-full bg-ink px-6 text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Open the studio
      </Link>
    </main>
  )
}

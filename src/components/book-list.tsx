import Image from 'next/image'
import Link from 'next/link'
import { getPublishedBooks } from '@/sanity/lib/books'

export async function BookList() {
  const books = await getPublishedBooks()

  if (books.length === 0) {
    return <p className="mt-10 text-lg text-muted">Publish a book in the studio and it will show up here.</p>
  }

  return (
    <ul className="mt-10 flex flex-col gap-4">
      {books.map((book) => (
        <li key={book.id}>
          <Link
            href={`/m/${book.slug}`}
            className="flex gap-4 rounded-2xl border border-line bg-white p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {book.cover ? (
              <span className="relative h-24 w-20 shrink-0 overflow-hidden bg-night">
                <Image
                  src={book.cover.url}
                  alt={book.cover.alt}
                  fill
                  sizes="80px"
                  className="object-cover"
                  placeholder={book.cover.lqip ? 'blur' : 'empty'}
                  blurDataURL={book.cover.lqip}
                />
              </span>
            ) : null}
            <span className="flex min-w-0 flex-col justify-center">
              {book.dateLabel ? <span className="text-sm text-muted">{book.dateLabel}</span> : null}
              <span className="font-serif text-3xl leading-none">{book.title}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

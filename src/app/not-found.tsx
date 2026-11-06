import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-6">
      <h1 className="font-serif text-5xl leading-none">This page is not here.</h1>
      <Link href="/" className="mt-8 w-fit text-sm underline-offset-4 hover:underline">
        Back home
      </Link>
    </main>
  )
}

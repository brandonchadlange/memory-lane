import { headers } from 'next/headers'

export async function requestOrigin(): Promise<string> {
  const headerList = await headers()
  const host = (headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'localhost:3000')
    .split(',')[0]
    ?.trim()
  const fallbackProto = host?.startsWith('localhost') || host?.startsWith('127.0.0.1') ? 'http' : 'https'
  const proto = (headerList.get('x-forwarded-proto') ?? fallbackProto).split(',')[0]?.trim()
  return `${proto}://${host}`
}

const ALPHABET = 'abcdefghijkmnopqrstuvwxyz23456789'

export function createPrivateSlug(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('')
}

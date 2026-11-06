import { ShareIcon } from '@sanity/icons/Share'
import type { DocumentActionComponent, SanityDocument } from 'sanity'

function readSlug(document: SanityDocument | null): string | undefined {
  const slug = document?.slug
  if (!slug || typeof slug !== 'object' || !('current' in slug)) return undefined
  const current = slug.current
  return typeof current === 'string' && current.length > 0 ? current : undefined
}

export const openShareAction: DocumentActionComponent = (props) => {
  const slug = readSlug(props.published) ?? readSlug(props.draft) ?? readSlug(props.version)

  return {
    label: 'Open share page',
    icon: ShareIcon,
    disabled: !slug,
    title: slug ? 'Link, QR code, and a print of the cover' : 'Save the book before sharing it',
    onHandle: () => {
      if (!slug) return
      window.open(`/m/${slug}/share`, '_blank', 'noopener,noreferrer')
      props.onComplete()
    },
  }
}

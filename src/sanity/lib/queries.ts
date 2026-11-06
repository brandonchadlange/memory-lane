import { defineQuery } from 'next-sanity'

const imageFields = /* groq */ `
  alt,
  hotspot,
  crop,
  asset->{
    _id,
    metadata { lqip }
  }
`

export const MEMORY_BOOK_QUERY = defineQuery(/* groq */ `
  *[_type == "memoryBook" && slug.current == $slug][0]{
    title,
    "slug": slug.current,
    date,
    dedication,
    soundtrackTitle,
    soundtrackUrl,
    cover{ ${imageFields} },
    moments[]{
      _key,
      _type,
      caption,
      image{ ${imageFields} },
      video{
        asset->{ url }
      }
    }
  }
`)

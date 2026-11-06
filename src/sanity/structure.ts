import { ImagesIcon } from '@sanity/icons/Images'
import type { StructureResolver } from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Memory Lane')
    .items([
      S.listItem()
        .title('Memory books')
        .icon(ImagesIcon)
        .child(S.documentTypeList('memoryBook').title('Memory books')),
    ])

import { BookIcon } from '@sanity/icons/Book'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { createPrivateSlug } from '../../lib/slug'
import { youtubeVideoId } from '../../lib/youtube'

export const memoryBook = defineType({
  name: 'memoryBook',
  title: 'Memory book',
  type: 'document',
  icon: BookIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Private link',
      type: 'slug',
      description: 'This is the secret part of the address. Keep the generated value.',
      initialValue: () => ({ _type: 'slug', current: createPrivateSlug() }),
      options: {
        source: () => createPrivateSlug(),
        slugify: (value) => value,
      },
      validation: (rule) =>
        rule.required().custom((value) => {
          const current = value?.current
          if (!current) return 'A private link is required'
          if (!/^[a-z0-9]{8,}$/.test(current)) return 'Use at least 8 letters or numbers'
          return true
        }),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      description: 'When this memory happened.',
    }),
    defineField({
      name: 'dedication',
      title: 'Note',
      type: 'text',
      rows: 4,
      description: 'Shown at the end of the book.',
      validation: (rule) => rule.max(600),
    }),
    defineField({
      name: 'cover',
      title: 'Cover',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Description',
          type: 'string',
          description: 'What is in this photograph.',
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'soundtrackTitle',
      title: 'Song name',
      type: 'string',
      description: 'Shown beside the player. For example, the title of the song.',
      validation: (rule) => rule.max(120),
    }),
    defineField({
      name: 'soundtrackUrl',
      title: 'YouTube link',
      type: 'url',
      description: 'The song starts when someone opens the memory. Paste a link to the video or YouTube Music track.',
      validation: (rule) =>
        rule.custom((value) => {
          if (!value) return true
          return youtubeVideoId(value) ? true : 'Paste a YouTube link, such as https://www.youtube.com/watch?v=…'
        }),
    }),
    defineField({
      name: 'moments',
      title: 'Moments',
      type: 'array',
      of: [defineArrayMember({ type: 'photoMoment' }), defineArrayMember({ type: 'videoMoment' })],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      date: 'date',
      media: 'cover',
    },
    prepare({ title, date, media }) {
      return {
        title: title || 'Untitled memory',
        subtitle: date || 'No date',
        media,
      }
    },
  },
})

import { ImageIcon } from '@sanity/icons/Image'
import { PlayIcon } from '@sanity/icons/Play'
import { defineField, defineType } from 'sanity'

export const photoMoment = defineType({
  name: 'photoMoment',
  title: 'Photo',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'image',
      title: 'Photo',
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
      name: 'caption',
      title: 'Caption',
      type: 'string',
      validation: (rule) => rule.max(180),
    }),
  ],
  preview: {
    select: {
      caption: 'caption',
      alt: 'image.alt',
      media: 'image',
    },
    prepare({ caption, alt, media }) {
      return {
        title: caption || alt || 'Photo',
        media,
      }
    },
  },
})

export const videoMoment = defineType({
  name: 'videoMoment',
  title: 'Video',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'video',
      title: 'Video',
      type: 'file',
      options: {
        accept: 'video/mp4,video/webm,video/quicktime',
      },
      description: 'MP4 plays on the most phones.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      validation: (rule) => rule.max(180),
    }),
  ],
  preview: {
    select: { caption: 'caption' },
    prepare({ caption }) {
      return { title: caption || 'Video' }
    },
  },
})

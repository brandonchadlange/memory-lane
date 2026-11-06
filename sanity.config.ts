import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { openShareAction } from './src/sanity/actions'
import { schemaTypes } from './src/sanity/schemaTypes'
import { structure } from './src/sanity/structure'
import { dataset, projectId } from './src/sanity/env'

export default defineConfig({
  name: 'memory-lane',
  title: 'Memory Lane',
  projectId,
  dataset,
  basePath: '/studio',
  plugins: [structureTool({ structure })],
  schema: { types: schemaTypes },
  document: {
    actions: (previous, context) =>
      context.schemaType === 'memoryBook' ? [...previous, openShareAction] : previous,
  },
})

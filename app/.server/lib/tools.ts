import { tool } from 'ai'
import z from 'zod'
import { htmlToMarkdown } from '~/lib/utils'
import { getReadability } from './utils'

export const getUrlContent = tool({
  description:
    'Can retrieve the main text content of a given URL webpage and return it in Markdown format',
  inputSchema: z.object({
    url: z.string().describe('The url to fetch the content from')
  }),
  execute: async ({ url }) => {
    try {
      const res = await fetch(url).then((res) => res.text())
      const content = getReadability(res, url)
      const markdown = htmlToMarkdown(content?.content || '')
      return content?.content ? markdown : 'Failed to retrieve page content'
    } catch (error) {
      console.error(error)
      return 'Failed to retrieve page content'
    }
  }
})

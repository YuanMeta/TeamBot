import { tool } from 'ai'
import z from 'zod'
import { htmlToMarkdown } from '~/lib/utils'
import { getReadability } from './utils'
import type { SearchOptions } from 'types'
import { tavily } from '@tavily/core'

export const getUrlContent = tool({
  description:
    'Can retrieve the main text content of a given URL webpage and return it in Markdown format',
  inputSchema: z.object({
    url: z.string().describe('The url to fetch the content from')
  }),
  execute: async ({ url }) => {
    const res = await fetch(url).then((res) => res.text())
    const content = getReadability(res, url)
    const markdown = htmlToMarkdown(content?.content || '')
    return content?.content ? markdown : 'Failed to retrieve page content'
  }
})

export const createWebSearchTool = (options: SearchOptions) => {
  let execute: ((input: { query: string }) => any) | null = null
  if (options.mode === 'tavily') {
    const tavilyClient = tavily({
      apiKey: options.apiKey ?? ''
    })
    execute = async ({ query }) => {
      const response = await tavilyClient.search(query, {
        topic: 'news',
        includeFavicon: true
      })
      return response.results.map((result) => ({
        title: result.title,
        url: result.url,
        summary: result.content,
        score: result.score,
        date: result.publishedDate,
        // @ts-ignore
        favicon: result.favicon
      }))
    }
  }
  return tool({
    description: 'Search the web for up-to-date information',
    inputSchema: z.object({
      query: z.string().min(1).max(100).describe('The search query')
    }),
    execute: execute ?? ((() => 'No search tool available') as any)
  })
}

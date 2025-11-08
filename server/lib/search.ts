import { tavily } from '@tavily/core'
import { tool } from 'ai'
import Exa from 'exa-js'
import type { SearchOptions, SearchResult } from 'types'
import { google } from 'googleapis'
import z from 'zod'

export const runWebSearch = async (
  query: string,
  options: SearchOptions
): Promise<SearchResult[] | undefined> => {
  if (options.mode === 'tavily') {
    const tavilyClient = tavily({
      apiKey: options.apiKey ?? ''
    })
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
  if (options.mode === 'exa') {
    const exa = new Exa(options.apiKey)
    const response = await exa.search(query, {
      type: 'auto'
    })
    return response.results.map((result) => ({
      title: result.title!,
      url: result.url,
      summary: result.text,
      score: result.score,
      date: result.publishedDate,
      favicon: result.favicon
    }))
  }
  if (options.mode === 'google') {
    const customsearch = google.customsearch('v1')
    const response = await customsearch.cse.list({
      auth: options.apiKey,
      cx: options.cseId,
      q: query
    })
    const searchResults = response.data
    return searchResults?.items?.map((item) => ({
      title: item.title!,
      summary: item.snippet!,
      url: item.link!,
      favicon: item.link
        ? `https://www.google.com/s2/favicons?domain=${new URL(item.link).host}&sz=64`
        : undefined
    }))
  }
}
export const createWebSearchTool = (options: SearchOptions) => {
  return tool({
    description: 'Search the web for up-to-date information',
    inputSchema: z.object({
      query: z.string().min(1).max(100).describe('The search query')
    }),
    execute: async ({ query }) => {
      const results = await runWebSearch(query, options)
      if (results) {
        return results
      }
      return 'No search tool available'
    }
  })
}

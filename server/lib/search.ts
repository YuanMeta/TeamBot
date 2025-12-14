import { tavily } from '@tavily/core'
import { tool } from 'ai'
import Exa from 'exa-js'
import type { AiContext, SearchOptions, SearchResult } from 'types'
import { google } from 'googleapis'
import z from 'zod'
import { compressSearchResults } from './prompt'
import { addTokens } from 'server/db/query'
import { messages } from 'server/db/drizzle/schema'
import { aesDecrypt } from './utils'
import { eq } from 'drizzle-orm'

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
      snippet: item.snippet!,
      url: item.link!,
      favicon: item.link
        ? `https://www.google.com/s2/favicons?domain=${
            new URL(item.link).host
          }&sz=64`
        : undefined
    }))
  }
  if (options.mode === 'bocha') {
    const res = await fetch('https://api.bochaai.com/v1/web-search', {
      method: 'POST',
      body: JSON.stringify({
        query: query,
        summary: true,
        count: 5
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey}`
      }
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data?.message)
    }
    try {
      return data.data.webPages.value.map((item: any) => ({
        title: item.name,
        summary: item.summary,
        url: item.url,
        favicon: item.siteIcon,
        date: item.datePublished
      }))
    } catch (e: any) {
      throw new Error(e.message || '搜索失败，请检查API密钥是否正确')
    }
  }
  if (options.mode === 'zhipu') {
    const res = await fetch('https://open.bigmodel.cn/api/paas/v4/web_search', {
      method: 'POST',
      body: JSON.stringify({
        search_query: query,
        search_engine: 'search_std',
        search_intent: false
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey}`
      }
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data?.error?.message)
    }
    try {
      return data.search_result.map((item: any) => ({
        title: item.title,
        summary: item.content,
        url: item.link,
        favicon: item.icon,
        date: item.publish_date
      }))
    } catch (e: any) {
      throw new Error(e.message || '搜索失败，请检查API密钥是否正确')
    }
  }
}
export const createWebSearchTool = (
  options: SearchOptions & { description?: string }
) => {
  return tool({
    description:
      options.description ||
      'Retrieve external, up-to-date factual evidence via web search.\nUse ONLY when the answer requires external verification or recent information not guaranteed by model knowledge.',
    inputSchema: z.object({
      query: z.string().min(1).max(100).describe('The search query')
    }),
    execute: async ({ query }, { toolCallId, experimental_context }) => {
      const ctx = experimental_context as AiContext
      const results = await runWebSearch(query, options)

      if (ctx.assistant.options.compressSearchResults && results) {
        const res = await compressSearchResults({
          assistant: {
            mode: ctx.assistant.mode,
            apiKey: ctx.assistant.apiKey,
            baseUrl: ctx.assistant.baseUrl
          },
          model: ctx.model,
          query: query,
          searchResults: results
        })
        await addTokens(ctx.db, {
          assistantId: ctx.assistant.id,
          model: ctx.model,
          usage: res.usage
        })
        const msg = await ctx.db.query.messages.findFirst({
          columns: { context: true },
          where: { id: ctx.aiMessageId }
        })
        if (msg) {
          await ctx.db
            .update(messages)
            .set({
              context: {
                ...msg.context,
                toolCallOriginData: {
                  ...msg.context?.toolCallOriginData,
                  [toolCallId]: results
                }
              }
            })
            .where(eq(messages.id, ctx.aiMessageId))
        }
        return res.summary
      } else if (results) {
        return results
      }
      return 'No search tool available'
    }
  })
}

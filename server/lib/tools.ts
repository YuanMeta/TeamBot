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

export const createHttpTool = (options: {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  description: string
  headers?: Record<string, string>
  params?: Record<string, any>
  input?: {
    key: string
    type: 'string' | 'number'
    describe: string
  }[]
}) => {
  const schemaFields: Record<string, any> = {}
  if (options.input && options.input.length > 0) {
    options.input.forEach((field) => {
      if (field.type === 'string') {
        schemaFields[field.key] = z.string().describe(field.describe)
      } else if (field.type === 'number') {
        schemaFields[field.key] = z.number().describe(field.describe)
      }
    })
  }

  const inputSchema =
    Object.keys(schemaFields).length > 0 ? z.object(schemaFields) : z.object({})

  return tool({
    description: options.description,
    inputSchema,
    execute: async (input) => {
      try {
        const method = options.method.toUpperCase()
        const headers = { ...options.headers }
        const allParams = { ...options.params, ...input }

        let url = options.url
        let fetchOptions: RequestInit = {
          method
        }
        if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
          headers['Content-Type'] = 'application/json'
          fetchOptions.body = JSON.stringify(allParams)
        } else {
          // GET/DELETE: 将参数作为查询字符串
          if (Object.keys(allParams).length > 0) {
            const queryString = new URLSearchParams(
              Object.entries(allParams).reduce(
                (acc, [key, value]) => {
                  acc[key] = String(value)
                  return acc
                },
                {} as Record<string, string>
              )
            ).toString()
            url = `${url}${url.includes('?') ? '&' : '?'}${queryString}`
          }
        }
        fetchOptions.headers = headers
        const response = await fetch(url, fetchOptions)
        const contentType = response.headers.get('content-type')

        let data
        if (contentType?.includes('application/json')) {
          data = await response.json()
        } else {
          data = await response.text()
        }
        if (!response.ok) {
          return {
            success: false,
            status: response.status,
            statusText: response.statusText,
            error: data
          }
        }
        return {
          success: true,
          status: response.status,
          data
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  })
}

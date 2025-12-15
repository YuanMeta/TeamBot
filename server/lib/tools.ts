import { tool, type Tool } from 'ai'
import z from 'zod'
import { htmlToMarkdown } from '~/lib/utils'
import { getReadability } from './utils'
import { createWebSearchTool } from './search'
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import type { AssistantData, ToolData } from 'server/db/type'
import type { DbInstance } from 'server/db'

export const systemTools = ['fetch_url_content']

export const getUrlContent = tool({
  description: `Fetch and return the main text content of the provided URL in Markdown. Only call this tool when you need to verify or retrieve webpage content that the model's internal knowledge may not cover—do NOT call for basic known facts.`,
  inputSchema: z.object({
    url: z.string().describe('The url to fetch the content from')
  }),
  execute: async ({ url }) => {
    const res = await fetch(url).then((res) => res.text())
    const content = getReadability(res, url)
    let markdown = htmlToMarkdown(content?.content || '')
    markdown =
      markdown.length > 5000 ? markdown.slice(0, 5000) + '...' : markdown
    return content?.content ? markdown : 'Failed to retrieve page content'
  }
})

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
              Object.entries(allParams).reduce((acc, [key, value]) => {
                acc[key] = String(value)
                return acc
              }, {} as Record<string, string>)
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

export const composeTools = async (
  db: DbInstance,
  assistant: AssistantData & { tools: ToolData[] },
  options: {
    search: boolean
  }
) => {
  const toolsRecord: Record<string, Tool> = {}
  if (assistant.options.webSearchMode === 'builtin' && options.search) {
    if (assistant.mode === 'gemini') {
      toolsRecord.google_search = google.tools.googleSearch({})
      toolsRecord.url_context = google.tools.urlContext({})
    }
    if (assistant.mode === 'openai') {
      toolsRecord.web_search = openai.tools.webSearch({})
    }
    if (assistant.mode === 'anthropic') {
      toolsRecord.web_search = anthropic.tools.webSearch_20250305({})
    }
    if (assistant.mode === 'z-ai') {
      toolsRecord['web_search'] = createWebSearchTool('zhipu', {
        apiKey: assistant.apiKey!,
        count: 5,
        modeParams: {
          zhipu: {
            search_engine: 'search_std'
          }
        }
      })
    }
  }

  if (assistant.tools.length) {
    for (let t of assistant.tools) {
      if (t.type === 'http') {
        try {
          const http = JSON.parse(t.params.http)
          toolsRecord[t.id] = createHttpTool({
            description: t.description,
            ...http
          })
        } catch (e) {
          console.error(e)
        }
      }
      if (t.type === 'system' && t.id === 'fetch_url_content') {
        toolsRecord[t.id] = getUrlContent
      }
    }
  }
  if (
    assistant.webSearchId &&
    assistant.options.webSearchMode === 'custom' &&
    assistant.options.agentWebSearch
  ) {
    const searchData = await db.query.webSearches.findFirst({
      where: { id: assistant.webSearchId }
    })
    if (searchData) {
      toolsRecord['web_search'] = createWebSearchTool(
        searchData.mode,
        searchData.params
      )
    }
  }
  return toolsRecord
}

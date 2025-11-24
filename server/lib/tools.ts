import { tool, type Tool } from 'ai'
import z from 'zod'
import { htmlToMarkdown } from '~/lib/utils'
import { getReadability } from './utils'
import type { Knex } from 'knex'
import { parseRecord } from './table'
import { createWebSearchTool } from './search'
import { google } from '@ai-sdk/google'
import type { TableAssistant } from 'types/table'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
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

export const composeTools = async (
  db: Knex,
  assistant: TableAssistant,
  selectedTools: string[],
  options: {
    builtinSearch: boolean
  }
) => {
  const toolsId = await db('assistant_tools')
    .where({ assistant_id: assistant.id })
    .select('tool_id')
  let toolsData = await db('tools')
    .whereIn(
      'id',
      toolsId.map((t) => t.tool_id)
    )
    .select('*')
  toolsData = toolsData.map((t) => parseRecord(t))
  const tools: Record<string, Tool> = {
    fetch_url_content: getUrlContent
  }
  const hasCustomeWebSearch = toolsData.some((t) => t.type === 'web_search')
  if (!hasCustomeWebSearch) {
    if (assistant.mode === 'gemini' && options.builtinSearch) {
      tools.google_search = google.tools.googleSearch({})
      tools.url_context = google.tools.urlContext({})
    }
    if (assistant.mode === 'openai' && options.builtinSearch) {
      tools.web_search = openai.tools.webSearch({})
    }
    if (assistant.mode === 'anthropic' && options.builtinSearch) {
      tools.web_search = anthropic.tools.webSearch_20250305({})
    }
    if (assistant.mode === 'z-ai' && options.builtinSearch) {
      tools['web_search'] = createWebSearchTool({
        mode: 'zhipu',
        apiKey: assistant.api_key!
      })
    }
  }

  for (let t of toolsData) {
    if (t.type === 'web_search' && (t.auto || selectedTools.includes(t.id))) {
      tools[t.id] = createWebSearchTool({
        mode: t.params.mode as any,
        apiKey: t.params.apiKey,
        cseId: t.params.cseId
      })
    }
    if (t.type === 'http' && (t.auto || selectedTools.includes(t.id))) {
      try {
        const http = JSON.parse(t.params.http)
        tools[t.id] = createHttpTool({
          description: t.description,
          ...http
        })
      } catch (e) {}
    }
  }
  return tools
}

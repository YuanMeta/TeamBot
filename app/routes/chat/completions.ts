import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
  type APICallError,
  type Tool
} from 'ai'
import type { Route } from './+types/completions'
import z from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '~/.server/lib/prisma'
import type { MessagePart, SearchOptions, Usage } from '~/types'
import { createClient } from '~/.server/lib/checkConnect'
import type { Prisma } from '@prisma/client'
import { createWebSearchTool, getUrlContent } from '~/.server/lib/tools'

const InputSchema = z.object({
  chatId: z.string(),
  regenerate: z.boolean().optional(),
  repoIds: z.string().array().optional()
})

export async function action({ request }: Route.LoaderArgs) {
  const json: z.infer<typeof InputSchema> = await request.json()
  try {
    InputSchema.parse(json)
  } catch (e) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: (e as Error).message
    })
  }
  const chat = await prisma.chat.findUnique({
    where: {
      // 后续加入userId 条件
      id: json.chatId
    },
    include: { assistant: true }
  })
  if (!chat) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Chat not found'
    })
  }
  const messages = await prisma.message.findMany({
    where: {
      chatId: chat.id
    },
    skip: chat.messageOffset
  })
  const uiMessages: UIMessage[] = []
  if (messages.length > 2) {
    messages.slice(0, -2).map((m) => {
      const msg: UIMessage = {
        id: m.id,
        role: m.role as 'user' | 'assistant',
        parts: []
      }
      let parts = m.parts as unknown as MessagePart[]
      for (let p of parts) {
        if (p.type === 'text') {
          msg.parts.push({
            type: 'text',
            text: p.text
          })
        }
        if (p.type === 'tool') {
          if (p.state === 'error') {
            msg.parts.push({
              type: 'dynamic-tool',
              toolName: p.toolName,
              toolCallId: p.toolCallId,
              input: p.input,
              output: undefined,
              state: 'output-error',
              errorText: p.errorText || ''
            })
          } else {
            msg.parts.push({
              type: 'dynamic-tool',
              toolName: p.toolName,
              toolCallId: p.toolCallId,
              input: p.input,
              output: p.output,
              state: 'output-available'
            })
          }
        }
      }
      uiMessages.push(msg)
    })
  }
  const [userMessage, assistantMessage] = messages.slice(-2)
  uiMessages.push({
    id: userMessage.id,
    role: 'user',
    parts: [
      {
        type: 'text',
        text: (userMessage.parts as MessagePart[])?.[0]?.text!
      }
    ]
  })
  const tools: Record<string, Tool> = {
    getUrlContent
  }
  const search = chat.assistant?.webSearch as SearchOptions
  if (search?.mode) {
    const tool = createWebSearchTool(search)
    if (tool) {
      tools['webSearch'] = tool
    }
  }
  const client = createClient({
    mode: chat.assistant!.mode,
    apiKey: chat.assistant!.apiKey,
    baseUrl: chat.assistant!.baseUrl
  })!
  const result = streamText({
    model: client(chat.model!),
    messages: convertToModelMessages(uiMessages),
    stopWhen: stepCountIs(20),
    tools,
    onFinish: async (data) => {
      // console.log('data', data.steps)
      // console.log('request', JSON.stringify(data.request.body || null))
      const steps: any[] = []
      const parts: MessagePart[] = []
      let usage: Usage = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        reasoningTokens: 0,
        cachedInputTokens: 0
      }
      for (let s of data.steps) {
        let step = {
          usage: s.usage,
          finishReason: s.finishReason as 'stop' | 'tool-calls',
          toolName:
            s.finishReason === 'tool-calls'
              ? s.content.find((c) => c.type === 'tool-result')?.toolName
              : undefined
        }
        if (s.usage) {
          for (let key in s.usage) {
            let keyName = key as keyof Usage
            if (usage[keyName] !== undefined) {
              usage[keyName] += (s.usage[keyName] as number) || 0
            }
          }
        }
        for (let c of s.content) {
          if (c.type === 'text') {
            parts.push({
              type: 'text',
              text: c.text
            })
          }
          if (c.type === 'tool-result' || c.type === 'tool-error') {
            parts.push({
              type: 'tool',
              toolName: c.toolName,
              toolCallId: c.toolCallId,
              input: c.input,
              output: c.type === 'tool-result' ? c.output : undefined,
              state: c.type === 'tool-result' ? 'completed' : 'error'
            })
          }
          if (c.type === 'reasoning' && c.text) {
            parts.push({
              type: 'reasoning',
              reasoning: c.text,
              completed: true
            })
          }
        }
        steps.push(step)
      }
      if (parts.length) {
        await prisma.message.update({
          where: { id: assistantMessage.id },
          data: {
            parts,
            steps: steps as unknown as Prisma.JsonArray,
            input_tokens: usage.inputTokens,
            output_tokens: usage.outputTokens,
            total_tokens: usage.totalTokens,
            reasoning_tokens: usage.reasoningTokens,
            cached_input_tokens: usage.cachedInputTokens
          }
        })
      }
    },
    onError: (error) => {
      let err = error.error as APICallError
      console.log('request', err)
    }
  })
  return result.toUIMessageStreamResponse()
}

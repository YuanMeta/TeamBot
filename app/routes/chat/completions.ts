import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage
} from 'ai'
import type { Route } from './+types/completions'
import z from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '~/.server/lib/prisma'
import type { ToolCall } from '~/types'
import { createClient } from '~/.server/lib/checkConnect'
import type { Message, Prisma } from '@prisma/client'
import { getUrlContent } from '~/.server/lib/tools'

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
        role: m.role as 'user' | 'assistant' | 'system',
        parts: []
      }
      const tools = m.tools as unknown as ToolCall[]
      if (tools?.length) {
        tools.forEach((t) => {
          msg.parts.push({
            type: 'dynamic-tool',
            toolName: t.name,
            toolCallId: t.id,
            input: t.input,
            output: t.output,
            state: 'output-available'
          })
        })
      }
      msg.parts.push({
        type: 'text',
        text: m.content || ''
      })
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
        text: userMessage.content!
      }
    ]
  })
  const client = createClient({
    mode: chat.assistant!.mode,
    apiKey: chat.assistant!.apiKey,
    baseUrl: chat.assistant!.baseUrl
  })!

  const result = streamText({
    model: client(chat.model!),
    messages: convertToModelMessages(uiMessages),
    stopWhen: stepCountIs(5),
    tools: { getUrlContent },
    onFinish: async (data) => {
      // console.log('request', JSON.stringify(data.request.body || null))
      let text = ''
      let reasoning: undefined | '' = undefined
      let tools: ToolCall[] = []
      for (let s of data.steps) {
        for (let c of s.content) {
          if (c.type === 'text') {
            text += c.text
            if (s.finishReason === 'tool-calls') {
              text += '\n\n'
            }
          }
          if (c.type === 'tool-result') {
            tools.push({
              name: c.toolName,
              id: c.toolCallId,
              input: c.input,
              output: c.output
            })
          }
          if (c.type === 'reasoning') {
            reasoning = (reasoning || '') + c.text
          }
        }
      }
      if (text) {
        await prisma.message.update({
          where: { id: assistantMessage.id },
          data: {
            reasoning: reasoning,
            content: text,
            usage: data.usage,
            tools: tools.length
              ? (tools as unknown as Prisma.JsonArray)
              : undefined
          }
        })
      }
    },
    onError: (error) => {
      console.log('step error', error)
    }
  })
  return result.toUIMessageStreamResponse()
}

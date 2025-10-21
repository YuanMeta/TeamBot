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
            state: t.state
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
  // 使用 AI SDK 生成流式文本，包含工具
  const result = streamText({
    model: client(chat.model!),
    // tools, // 工具会在需要时自动调用,
    messages: convertToModelMessages(uiMessages),
    stopWhen: stepCountIs(5),
    onStepFinish: (data) => {
      console.log('step finish', data)
    },
    onError: (error) => {
      console.log('step error', error)
    }
  })
  console.log('request body', (await result.request).body)
  return result.toUIMessageStreamResponse({
    onFinish: ({ responseMessage, messages, isContinuation, isAborted }) => {
      responseMessage.parts.forEach((p) => {
        if (p.type === 'dynamic-tool') {
          const tool = p.toolName
          const toolCallId = p.toolCallId
          const state = p.state
          const input = p.input
          const output = p.output
        }
      })
      // 在服务端可拿到最终返回给客户端的 UIMessage
      console.log('UI stream finished', {
        isContinuation,
        isAborted,
        responseMessage
      })
    },
    onError: (error: any) => {
      console.log('stream error', error)
      return error?.message || 'stream error'
    }
  })
}

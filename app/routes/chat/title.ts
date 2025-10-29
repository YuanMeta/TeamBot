import { TRPCError } from '@trpc/server'
import z from 'zod'
import type { Route } from './+types/title'
import { prisma } from '~/.server/lib/prisma'
import { createClient } from '~/.server/lib/checkConnect'
import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import { nanoid } from 'nanoid'

const InputSchema = z.object({
  chatId: z.string(),
  userPrompt: z.string(),
  aiResponse: z.string()
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
  const client = createClient({
    mode: chat.assistant!.mode,
    apiKey: chat.assistant!.apiKey,
    baseUrl: chat.assistant!.baseUrl
  })!
  const messages: UIMessage[] = [
    {
      id: nanoid(),
      role: 'user',
      parts: [{ type: 'text', text: json.userPrompt }]
    },
    {
      id: nanoid(),
      role: 'assistant',
      parts: [{ type: 'text', text: json.aiResponse }]
    }
  ]

  const result = streamText({
    model: client(chat.model!),
    system: `You are a conversational assistant and you need to summarize the user's conversation into a title of 10 words or less., The summary needs to maintain the original language.`,
    messages: convertToModelMessages(messages),
    onFinish: async (data) => {
      if (data.finishReason === 'stop') {
        let text = data.content.find((c) => c.type === 'text')?.text
        if (text) {
          await prisma.chat.update({
            where: { id: json.chatId },
            data: { title: text }
          })
        }
      }
    }
  })
  return result.toUIMessageStreamResponse()
}

import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type APICallError
} from 'ai'
import z from 'zod'
import { TRPCError } from '@trpc/server'
import type { AiContext, MessagePart, Usage } from '~/types'
import { composeTools } from '../lib/tools'
import { MessageManager } from '../lib/message'
import { getUser } from '../session'
import { saveFileByBase64, tid } from '../lib/utils'
import { recordRequest, testAssistantAuth } from '../db/query'
import { chats, messages } from '~/.server/drizzle/schema'
import { eq } from 'drizzle-orm'
import { type DbInstance } from '../db'
import dayjs from 'dayjs'
import type { Context } from 'hono'

const InputSchema = z.object({
  chatId: z.string(),
  assistantId: z.number(),
  model: z.string(),
  images: z.string().array().optional(),
  webSearch: z.boolean().optional()
})

export const completions = async (c: Context, db: DbInstance) => {
  const json: z.infer<typeof InputSchema> = await c.req.json()
  const user = await getUser(c.req.raw)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const uid = user.uid
  try {
    InputSchema.parse(json)
  } catch (e) {
    console.log('e', e)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: (e as Error).message
    })
  }
  if (!user.root) {
    await testAssistantAuth(db, {
      assistantId: json.assistantId,
      model: json.model,
      userId: user.uid
    })
  }
  const { uiMessages, chat, client, aiMsg, assistant, userMsg } =
    await MessageManager.getStreamMessage(db, {
      chatId: json.chatId,
      userId: uid,
      assistantId: json.assistantId,
      model: json.model,
      images: json.images
    })
  if (json.images?.length) {
    let paths: string[] = []
    for (let image of json.images) {
      const path = saveFileByBase64(image)
      paths.push(path)
    }
    db.update(messages)
      .set({
        files: paths
      })
      .where(eq(messages.id, userMsg.id))
  }
  const tools = await composeTools(assistant, {
    search: !!json.webSearch
  })
  uiMessages.unshift({
    id: tid(),
    role: 'system',
    parts: [
      {
        type: 'text',
        text: `Current time: ${dayjs().format('YYYY-MM-DD HH:mm')}`
      }
    ]
  })
  const controller = new AbortController()
  c.req.raw.signal.addEventListener(
    'abort',
    () => {
      controller.abort()
    },
    { once: true }
  )
  let text = ''
  await db
    .update(chats)
    .set({
      lastChatTime: new Date(),
      model: chat.model,
      assistantId: assistant.id
    })
    .where(eq(chats.id, chat.id))
  const toolChoose =
    assistant.options.webSearchMode === 'custom' &&
    assistant.options.agentWebSearch &&
    json.webSearch

  const result = streamText({
    model: client(json.model),
    messages: await convertToModelMessages(uiMessages),
    stopWhen: stepCountIs(assistant.options.stepCount || 5),
    tools,
    experimental_context: {
      db,
      aiMessageId: aiMsg.id,
      assistant,
      model: json.model,
      abortController: controller
    } satisfies AiContext,
    toolChoice: toolChoose ? 'required' : undefined,
    maxOutputTokens: Number(assistant.options.maxOutputTokens) || undefined,
    temperature: assistant.options.temperature.open
      ? Number(assistant.options.temperature)
      : undefined,
    topP: assistant.options.topP.open
      ? Number(assistant.options.topP.value)
      : undefined,
    frequencyPenalty: assistant.options.frequencyPenalty.open
      ? Number(assistant.options.frequencyPenalty.value)
      : undefined,
    presencePenalty: assistant.options.presencePenalty.open
      ? Number(assistant.options.presencePenalty.value)
      : undefined,
    abortSignal: controller.signal,
    system: assistant.prompt || undefined,
    providerOptions: {
      qwen:
        assistant.options.webSearchMode === 'builtin' && json.webSearch
          ? { enable_search: true }
          : {},
      openrouter:
        assistant.options.webSearchMode === 'builtin' && json.webSearch
          ? { plugins: [{ id: 'web', max_results: 5 }] }
          : {}
    },
    onAbort: async () => {
      await db
        .update(messages)
        .set({
          terminated: true
        })
        .where(eq(messages.id, aiMsg.id))
    },
    onChunk: (data) => {
      if (data.chunk.type === 'text-delta' && data.chunk.text) {
        text += data.chunk.text
      }
    },
    onFinish: async (data) => {
      // console.log('data', data.steps)
      // console.log('request', JSON.stringify(data.request.body || null))
      // console.log('response', JSON.stringify(data.response || null))
      const steps: any[] = []
      const parts: MessagePart[] = []
      let usage: Usage = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        reasoningTokens: 0,
        cachedInputTokens: 0
      }
      let text = ''
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
          if (c.type === 'text' && !/^[\s\n]*$/.test(c.text || '')) {
            parts.push({
              type: 'text',
              text: c.text
            })
            if (s.finishReason === 'stop' && c.text) {
              text = c.text
            }
          }
          if (c.type === 'tool-result' || c.type === 'tool-error') {
            parts.push({
              type: 'tool',
              toolName: c.toolName,
              toolCallId: c.toolCallId,
              input: c.input,
              output: c.type === 'tool-result' ? c.output : undefined,
              state: c.type === 'tool-result' ? 'completed' : 'error',
              errorText:
                c.type === 'tool-error'
                  ? c.error instanceof Error
                    ? c.error.message
                    : 'Unknown error'
                  : undefined
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
        await db
          .update(messages)
          .set({
            parts: parts,
            steps: steps,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            totalTokens: usage.totalTokens,
            text: text,
            reasoningTokens: usage.reasoningTokens,
            cachedInputTokens: usage.cachedInputTokens,
            model: json.model
          })
          .where(eq(messages.id, aiMsg.id))
      }
      await recordRequest(db, {
        assistantId: assistant.id,
        usage: usage,
        model: json.model,
        body: data.request.body || null,
        messageId: aiMsg.id,
        chatId: chat.id,
        task: 'chat'
      })
    },
    onError: async (error: any) => {
      let err = error.error as APICallError
      await db
        .update(messages)
        .set({
          error: err.message
        })
        .where(eq(messages.id, aiMsg.id))
      console.log('err request', err)
      console.log('err request body', JSON.stringify(err.requestBodyValues))
    }
  })
  return result.toUIMessageStreamResponse()
}

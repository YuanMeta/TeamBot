import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type APICallError
} from 'ai'
import z from 'zod'
import { TRPCError } from '@trpc/server'
import type { AiContext, MessagePart, Usage } from 'types'
import { composeTools } from '../lib/tools'
import { MessageManager } from '../lib/message'
import { getUser } from '../session'
import type { Request, Response } from 'express'
import { saveFileByBase64 } from '../lib/utils'
import { addTokens, checkAllowUseAssistant } from 'server/db/query'
import { chats, messages } from 'server/db/drizzle/schema'
import { eq } from 'drizzle-orm'
import { type DbInstance } from 'server/db'

const InputSchema = z.object({
  chatId: z.string(),
  assistantId: z.number(),
  model: z.string(),
  images: z.string().array().optional(),
  webSearch: z.boolean().optional()
})

export const completions = async (
  req: Request,
  res: Response,
  db: DbInstance
) => {
  const json: z.infer<typeof InputSchema> = req.body
  const user = await getUser(req)
  if (!user) {
    res.status(401).send('Unauthorized')
    return
  }
  const uid = user.uid
  try {
    InputSchema.parse(json)
  } catch (e) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: (e as Error).message
    })
  }
  const {
    uiMessages,
    summary,
    chat,
    client,
    assistantMessage,
    assistant,
    userMsg
  } = await MessageManager.getStreamMessage(db, {
    chatId: json.chatId,
    userId: uid,
    assistantId: json.assistantId,
    model: json.model,
    images: json.images
  })
  if (!user.root) {
    const allow = await checkAllowUseAssistant(db, uid, assistant.id)
    if (!allow) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'permission denied'
      })
    }
  }
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
  const tools = await composeTools(db, assistant, {
    search: !!json.webSearch
  })
  const controller = new AbortController()
  res.once('close', () => {
    controller.abort()
  })
  let text = ''
  await db
    .update(chats)
    .set({
      lastChatTime: new Date(),
      model: chat.model,
      assistantId: assistant.id
    })
    .where(eq(chats.id, chat.id))
  const result = streamText({
    model: client(json.model),
    messages: convertToModelMessages(uiMessages),
    stopWhen: stepCountIs(assistant.options.stepCount || 5),
    tools,
    experimental_context: {
      db,
      aiMessageId: assistantMessage.id,
      assistant,
      model: json.model
    } satisfies AiContext,
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
    system: MessageManager.getSystemPromp({
      prompt: assistant.prompt,
      summary: summary,
      images: json.images
    }),
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
        .where(eq(messages.id, assistantMessage.id))
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
          if (c.type === 'text') {
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
            parts: JSON.stringify(parts),
            steps: JSON.stringify(steps),
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            totalTokens: usage.totalTokens,
            text: text,
            reasoningTokens: usage.reasoningTokens,
            cachedInputTokens: usage.cachedInputTokens,
            model: json.model
          })
          .where(eq(messages.id, assistantMessage.id))
      }
      await addTokens(db, {
        assistantId: assistant.id,
        usage: usage,
        model: json.model
      })
    },
    onError: async (error: any) => {
      let err = error.error as APICallError
      await db
        .update(messages)
        .set({
          error: err.message
        })
        .where(eq(messages.id, assistantMessage.id))
      console.log('err request', JSON.stringify(err.requestBodyValues))
    }
  })
  result.pipeUIMessageStreamToResponse(res)
}

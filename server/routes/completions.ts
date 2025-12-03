import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type APICallError
} from 'ai'
import z from 'zod'
import { TRPCError } from '@trpc/server'
import type { MessagePart, Usage } from 'types'
import { composeTools } from '../lib/tools'
import { MessageManager } from '../lib/message'
import { getUserId } from '../session'
import type { Request, Response } from 'express'
import type { Knex } from 'knex'
import { saveFileByBase64, tid } from '../lib/utils'
import dayjs from 'dayjs'
const InputSchema = z.object({
  chatId: z.string(),
  assistantId: z.string(),
  model: z.string(),
  tools: z.string().array(),
  images: z.string().array().optional(),
  webSearch: z.boolean().optional()
})

export const completions = async (req: Request, res: Response, db: Knex) => {
  const json: z.infer<typeof InputSchema> = req.body

  const uid = await getUserId(req)
  if (!uid) {
    res.status(401).send('Unauthorized')
    return
  }

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
  if (json.images?.length) {
    let paths: string[] = []
    for (let image of json.images) {
      const path = saveFileByBase64(image)
      paths.push(path)
    }
    await db('messages')
      .where('id', userMsg.id)
      .update({
        files: JSON.stringify(paths) as any
      })
  }
  const tools = await composeTools(db, assistant, json.tools, {
    builtinSearch: assistant.options.builtin_search === 'on' && !!json.webSearch
  })
  const controller = new AbortController()
  res.once('close', () => {
    controller.abort()
  })
  let text = ''
  await db('chats').where('id', chat.id).update({
    last_chat_time: new Date(),
    model: chat.model!,
    assistant_id: assistant.id
  })

  const result = streamText({
    model: client(chat.model!),
    messages: convertToModelMessages(uiMessages),
    stopWhen: stepCountIs(20),
    tools,
    toolChoice: json.tools?.length ? 'required' : 'auto',
    maxOutputTokens: Number(assistant.options?.maxOutputTokens) || undefined,
    temperature: Number(assistant.options?.temperature) || undefined,
    topP: assistant.options.top_p.open
      ? Number(assistant.options?.top_p)
      : undefined,
    frequencyPenalty: assistant.options.frequencyPenalty.open
      ? Number(assistant.options?.frequencyPenalty)
      : undefined,
    presencePenalty: assistant.options.presencePenalty.open
      ? Number(assistant.options?.presencePenalty)
      : undefined,
    abortSignal: controller.signal,
    system: MessageManager.getSystemPromp({
      summary: summary,
      tools: json.tools,
      images: json.images
    }),
    providerOptions: {
      qwen:
        assistant.options.builtin_search === 'on' && json.webSearch
          ? { enable_search: true }
          : {},
      openrouter:
        assistant.options.builtin_search === 'on' && json.webSearch
          ? { plugins: [{ id: 'web', max_results: 5 }] }
          : {}
    },
    onAbort: async () => {
      await db('messages').where('id', assistantMessage.id).update({
        terminated: true
      })
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
        await db('messages')
          .where('id', assistantMessage.id)
          .update({
            parts: JSON.stringify(parts) as any,
            steps: JSON.stringify(steps) as any,
            input_tokens: usage.inputTokens,
            output_tokens: usage.outputTokens,
            total_tokens: usage.totalTokens,
            text: text,
            reasoning_tokens: usage.reasoningTokens,
            cached_input_tokens: usage.cachedInputTokens,
            model: chat.model
          })
      }
      const today = dayjs().format('YYYY-MM-DD')
      const record = await db('assistant_usages')
        .where('assistant_id', assistant.id)
        .where('created_at', today)
        .first()
      if (record) {
        await db('assistant_usages').where({ id: record.id }).increment({
          input_tokens: usage.inputTokens!,
          output_tokens: usage.outputTokens!,
          total_tokens: usage.totalTokens!,
          reasoning_tokens: usage.reasoningTokens!,
          cached_input_tokens: usage.cachedInputTokens!
        })
      } else {
        await db('assistant_usages').insert({
          id: tid(),
          assistant_id: assistant.id,
          input_tokens: usage.inputTokens!,
          output_tokens: usage.outputTokens!,
          total_tokens: usage.totalTokens!,
          reasoning_tokens: usage.reasoningTokens!,
          cached_input_tokens: usage.cachedInputTokens!,
          created_at: today
        })
      }
    },
    onError: async (error: any) => {
      let err = error.error as APICallError
      await db('messages').where('id', assistantMessage.id).update({
        error: err.message
      })
      console.log('err request', JSON.stringify(err.requestBodyValues))
    }
  })
  result.pipeUIMessageStreamToResponse(res)
}

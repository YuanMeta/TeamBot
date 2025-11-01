import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type APICallError,
  type Tool
} from 'ai'
import z from 'zod'
import { TRPCError } from '@trpc/server'
import type { MessagePart, SearchOptions, Usage } from 'types'
import { createWebSearchTool, getUrlContent } from '../lib/tools'
import { MessageManager } from '../lib/message'
import { getUserId } from '../session'
import type { Request, Response } from 'express'
import type { Knex } from 'knex'
const InputSchema = z.object({
  chatId: z.string(),
  regenerate: z.boolean().optional(),
  repoIds: z.string().array().optional()
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
  const { uiMessages, summary, chat, client, assistantMessage } =
    await MessageManager.getStreamMessage(db, {
      chatId: json.chatId,
      userId: uid
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
  const controller = new AbortController()
  req.once('close', () => {
    console.log('client close...')
    controller.abort()
  })
  const result = streamText({
    model: client(chat.model!),
    messages: convertToModelMessages(uiMessages),
    stopWhen: stepCountIs(20),
    abortSignal: controller.signal,
    system: MessageManager.getSystemPromp({ summary: summary, tools }),
    tools,
    onAbort: async () => {
      db('messages').where('id', assistantMessage.id).update({
        terminated: true
      })
    },
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
        db('messages')
          .where('id', assistantMessage.id)
          .update({
            parts: JSON.stringify(parts) as any,
            steps: JSON.stringify(steps) as any,
            input_tokens: usage.inputTokens,
            output_tokens: usage.outputTokens,
            total_tokens: usage.totalTokens,
            reasoning_tokens: usage.reasoningTokens,
            cached_input_tokens: usage.cachedInputTokens,
            model: chat.model
          })
      }
    },
    onError: async (error: any) => {
      let err = error.error as APICallError
      db('messages').where('id', assistantMessage.id).update({
        error: err.message
      })
      console.log('request', err)
    }
  })
  result.pipeUIMessageStreamToResponse(res)
}

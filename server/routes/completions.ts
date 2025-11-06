import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type APICallError,
  type Tool
} from 'ai'
import z from 'zod'
import { TRPCError } from '@trpc/server'
import type { MessagePart, Usage } from 'types'
import {
  createHttpTool,
  createWebSearchTool,
  getUrlContent
} from '../lib/tools'
import { MessageManager } from '../lib/message'
import { getUserId } from '../session'
import type { Request, Response } from 'express'
import type { Knex } from 'knex'
import { parseRecord } from 'server/lib/table'
const InputSchema = z.object({
  chatId: z.string(),
  regenerate: z.boolean().optional(),
  assistantId: z.string(),
  model: z.string(),
  repoIds: z.string().array().optional(),
  tools: z.string().array()
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
  const { uiMessages, summary, chat, client, assistantMessage, assistant } =
    await MessageManager.getStreamMessage(db, {
      chatId: json.chatId,
      userId: uid,
      assistantId: json.assistantId,
      model: json.model
    })
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
    get_url_content: getUrlContent
  }
  for (let t of toolsData) {
    if (t.type === 'web_search' && (t.auto || json.tools.includes(t.id))) {
      tools[t.lid] = createWebSearchTool({
        mode: t.params.mode as any,
        apiKey: t.params.apiKey,
        cseId: t.params.cseId
      })
    }
    if (t.type === 'http' && (t.auto || json.tools.includes(t.id))) {
      try {
        const http = JSON.parse(t.params.http)
        tools[t.lid] = createHttpTool({
          description: t.description,
          ...http
        })
      } catch (e) {}
    }
  }

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
    abortSignal: controller.signal,
    system: MessageManager.getSystemPromp({ summary: summary, tools }),
    tools,
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
        await db('messages')
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
      await db('messages').where('id', assistantMessage.id).update({
        error: err.message
      })
      console.log('request', err)
    }
  })
  result.pipeUIMessageStreamToResponse(res)
}

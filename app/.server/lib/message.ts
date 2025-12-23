import { generateText, type UIMessage } from 'ai'
import { TRPCError } from '@trpc/server'
import type { MessagePart } from '~/types'
import { createClient } from './connect'
import { findLast } from '~/lib/utils'
import { aesDecrypt } from './utils'
import { messages } from 'drizzle/schema'
import { eq } from 'drizzle-orm'
import type { AssistantData, MessageContext, MessageData } from '../db/type'
import { type DbInstance } from '../db'
import { cacheManage } from './cache'
import { recordRequest } from '../db/query'

type MessageItem = Pick<
  MessageData,
  | 'id'
  | 'text'
  | 'createdAt'
  | 'previousSummary'
  | 'role'
  | 'context'
  | 'parts'
  | 'files'
  | 'totalTokens'
>

async function getMessagesByCompress(
  db: DbInstance,
  {
    chatId,
    userId,
    assistant,
    model
  }: {
    assistant: AssistantData
    chatId: string
    userId: number
    model: string
  }
) {
  const latestSummary = await db.query.messages.findFirst({
    columns: { id: true, createdAt: true, previousSummary: true },
    where: {
      previousSummary: { isNotNull: true },
      chatId,
      userId,
      role: 'user'
    },
    orderBy: { createdAt: 'desc' }
  })
  let messagesData = await db.query.messages.findMany({
    columns: {
      id: true,
      text: true,
      createdAt: true,
      previousSummary: true,
      role: true,
      context: true,
      parts: true,
      files: true,
      totalTokens: true
    },
    where: {
      chatId,
      userId,
      createdAt: latestSummary ? { gte: latestSummary.createdAt } : undefined
    },
    orderBy: { createdAt: 'asc' }
  })
  const maxTokens = Number(assistant.options?.maxContextTokens) || 30000
  const [userMessage, assistantMessage] = messagesData.slice(-2)
  let messagesHistory = messagesData.slice(0, -2)
  if (messagesHistory.length >= 2) {
    const totalTokens =
      findLast(messagesHistory, (m) => m.role === 'assistant')?.totalTokens || 0
    if (totalTokens > maxTokens) {
      let compreMessages = messagesHistory.slice()
      let summaryMsg = userMessage
      if (messagesHistory.length >= 4) {
        // 保留最后一轮
        compreMessages = messagesHistory.slice(0, -2)
        messagesHistory = messagesHistory.slice(-2)
        summaryMsg = findLast(messagesHistory, (m) => m.role === 'user')!
      } else {
        messagesHistory = []
      }
      const taskModel = await cacheManage.getTaskModel({
        assistantId: assistant.id,
        model: model
      })
      const summaryData = await MessageManager.compreToken({
        assistant: {
          mode: taskModel!.mode,
          apiKey: taskModel!.apiKey
            ? await aesDecrypt(taskModel!.apiKey)
            : null,
          baseUrl: taskModel!.baseUrl
        },
        model: taskModel!.taskModel!,
        messages: compreMessages,
        previousSummary: latestSummary?.previousSummary
      })
      await db
        .update(messages)
        .set({
          previousSummary: summaryData.text
        })
        .where(eq(messages.id, summaryMsg.id))
      if (summaryData.usage) {
        await recordRequest(db, {
          assistantId: taskModel!.id,
          usage: summaryData.usage,
          model: taskModel!.taskModel!,
          body: {
            summary: summaryData.text,
            previousSummary: latestSummary?.previousSummary
          },
          task: 'compress'
        })
      }
      summaryMsg.previousSummary = summaryData.text
    }
  }
  return { messagesHistory, userMessage, assistantMessage }
}

async function getMessagesBySlice(
  db: DbInstance,
  {
    chatId,
    userId,
    messageCount
  }: {
    assistant: AssistantData
    chatId: string
    userId: number
    model: string
    messageCount: number
  }
) {
  let messagesData = await db.query.messages.findMany({
    columns: {
      id: true,
      text: true,
      createdAt: true,
      previousSummary: true,
      role: true,
      context: true,
      parts: true,
      files: true,
      totalTokens: true
    },
    where: {
      chatId,
      userId
    },
    orderBy: { createdAt: 'desc' },
    limit: messageCount * 2
  })
  let messages = messagesData.reverse()
  const [userMessage, assistantMessage] = messages.slice(-2)
  let messagesHistory = messages.slice(0, -2)
  return {
    messagesHistory,
    userMessage,
    assistantMessage
  }
}
function addMessageContext(
  text: string,
  data: {
    context?: MessageContext | null
    summary?: string | null
  }
): string {
  let contextText = ''

  try {
    if (data.summary) {
      contextText = `This is a summary of the previous conversation:\n ${data.summary}\n`
    }
    if (data.context?.docs?.length) {
      contextText = `The following are relevant reference documents.\n\n${data.context.docs
        .map((d) => `file: ${d.name}\n${d.content}`)
        .join('\n\n')}`
    }

    if (
      data.context?.searchResult?.results?.length ||
      data.context?.searchResult?.summary
    ) {
      contextText += `${
        contextText ? '\n\n' : ''
      }According to online search results, the following is the latest relevant information:\n${
        data.context.searchResult?.summary ||
        JSON.stringify(data.context.searchResult?.results)
      }`
    }
  } catch (e) {
    console.error(e)
  }
  if (contextText) {
    text = `${contextText}\n\n User Questions: ${text}`
  }
  return text
}
export class MessageManager {
  static async compreToken(data: {
    assistant: {
      mode: string
      apiKey?: string | null
      baseUrl?: string | null
    }
    model: string
    messages: Pick<
      MessageData,
      | 'context'
      | 'files'
      | 'id'
      | 'parts'
      | 'role'
      | 'text'
      | 'previousSummary'
      | 'createdAt'
    >[]
    previousSummary?: string | null
  }) {
    const client = createClient({
      mode: data.assistant.mode,
      api_key: data.assistant.apiKey,
      base_url: data.assistant.baseUrl
    })
    if (!client) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid assistant'
      })
    }
    const conversation = data.messages.map((m) => {
      return {
        role: m.role,
        content: m.text || ''
      }
    })
    const res = await generateText({
      model: client(data.model),
      system: `You are an assistant helping to manage conversation context for a large language model. 
The conversation history is becoming too long and may exceed the context window limit.

Your task:
- Summarize the previous conversation into a concise and information-rich summary.
- Keep all essential facts, decisions, user goals, and relevant context for future reasoning.
- Remove small talk, unnecessary repetition, or irrelevant details.
- Use clear and compact language, ideally under 1000 tokens in length.
- The summary should preserve the meaning and flow of the conversation so that the next model input can continue seamlessly.
- If there is a previous summary, combine the previous summary with the current conversation content.

Output only the summarized version of the conversation.`,
      maxOutputTokens: 2000,
      prompt: `${
        data.previousSummary
          ? `Previous summary:\n ${data.previousSummary}\n\n`
          : ''
      }Conversation:\n ${JSON.stringify(conversation)}`
    })
    return { text: res.text, usage: res.usage }
  }

  static async getStreamMessage(
    db: DbInstance,
    data: {
      chatId: string
      userId: number
      assistantId: number
      model: string
      images?: string[]
    }
  ) {
    const { chatId, userId } = data
    const chat = await db.query.chats.findFirst({
      where: { id: chatId, userId }
    })
    if (!chat) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Chat not found'
      })
    }
    let assistant = await db.query.assistants.findFirst({
      where: { id: data.assistantId },
      with: {
        tools: true
      }
    })
    if (!assistant) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Assistant not found'
      })
    }
    assistant.apiKey = assistant.apiKey
      ? await aesDecrypt(assistant.apiKey)
      : null
    const client = createClient({
      mode: assistant.mode,
      api_key: assistant.apiKey,
      base_url: assistant.baseUrl
    })!
    let history: MessageItem[] = [],
      userMsg: MessageItem | null = null,
      aiMsg: MessageItem | null = null
    if (assistant.options.summaryMode === 'slice') {
      const { messagesHistory, userMessage, assistantMessage } =
        await getMessagesBySlice(db, {
          chatId,
          userId,
          assistant,
          model: data.model,
          messageCount: assistant.options.messageCount || 10
        })
      history = messagesHistory
      userMsg = userMessage
      aiMsg = assistantMessage
    } else {
      const { messagesHistory, userMessage, assistantMessage } =
        await getMessagesByCompress(db, {
          chatId,
          userId,
          assistant,
          model: data.model
        })

      history = messagesHistory
      userMsg = userMessage
      aiMsg = assistantMessage
    }

    const uiMessages: UIMessage[] = []
    if (history.length >= 2) {
      history.map((m) => {
        const msg: UIMessage = {
          id: m.id,
          role: m.role as 'user' | 'assistant',
          parts: []
        }
        if (m.role === 'user') {
          let text = m.text
          text = addMessageContext(text!, {
            context: m.context,
            summary: m.previousSummary
          })
          msg.parts.push({
            type: 'text',
            text: text
          })
        } else {
          let parts = (m.parts as unknown as MessagePart[]) || []
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
        }

        uiMessages.push(msg)
      })
    }
    const userMsgUI: UIMessage = {
      id: userMsg.id,
      role: 'user',
      parts: [
        {
          type: 'text',
          text: addMessageContext(userMsg.text!, {
            context: userMsg.context,
            summary: userMsg.previousSummary
          })
        }
      ]
    }
    if (data.images?.length) {
      const part = userMsgUI.parts.find((p) => p.type === 'text')!
      part.text = `Please provide detailed information about the provided images, such as a summary, key objects, scene, colors, layout, and text content, so that they can be used in subsequent conversations.\n ${part.text}`
      userMsgUI.parts.push({
        type: 'file',
        url: data.images[0],
        mediaType: 'image/png',
        filename: 'photo.png'
      })
    }
    uiMessages.push(userMsgUI)
    return {
      uiMessages,
      chat,
      client,
      aiMsg,
      assistant,
      userMsg
    }
  }
}

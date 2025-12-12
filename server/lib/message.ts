import { generateText, type LanguageModel, type UIMessage } from 'ai'
import { TRPCError } from '@trpc/server'
import type { MessagePart } from 'types'
import { createClient } from './checkConnect'
import { findLast } from '~/lib/utils'
import { aesDecrypt } from './utils'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { assistants, chats, messages } from 'server/db/drizzle/schema'
import { and, eq } from 'drizzle-orm'
import type { MessageData } from 'server/db/type'
import { increment, type DbInstance } from 'server/db'
import { parseRecord } from 'server/db/query'

function addDocsContext(
  text: string,
  docs?: { name: string; content: string }[] | null
): string {
  if (docs?.length) {
    text = `User Questions: ${text}\nThe following are relevant reference documents.\n\n${docs
      .map((d) => `file: ${d.name}\n${d.content}`)
      .join('\n\n')}`
  }
  return text
}
export class MessageManager {
  static async compreTokena(data: {
    model: LanguageModel
    messages: MessageData[]
    previousSummary?: string | null
  }) {
    const conversation = data.messages.map((m) => {
      const parts = m.parts as unknown as MessagePart[]
      return {
        role: m.role,
        content: parts?.reverse().find((t) => t.type === 'text')?.text || ''
      }
    })
    const res = await generateText({
      model: data.model,
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
    return res.text
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
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
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
    let messagesData = await db
      .select()
      .from(messages)
      .where(and(eq(messages.chatId, chatId), eq(messages.userId, userId)))
      .offset(chat.messageOffset)
      .orderBy(messages.createdAt)
    messagesData = messagesData.map((m) => parseRecord(m))
    if (!messagesData.length) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No messages found'
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
    let summary = chat.summary
    const maxTokens = Number(assistant.options?.maxContextTokens) || 20000
    const [userMessage, assistantMessage] = messagesData.slice(-2)
    const uiMessages: UIMessage[] = []
    if (messagesData.length > 2) {
      let history = messagesData.slice(0, -2)
      const totalTokens =
        findLast(history, (m) => m.role === 'assistant')?.totalTokens || 0
      if (totalTokens > maxTokens && history.length >= 2) {
        let compreMessages = history.slice()
        if (
          history.length >= 6 &&
          (history.slice(-4).find((m) => m.role === 'assistant')?.totalTokens ||
            0) < maxTokens
        ) {
          // 保留最后两轮对话
          history = history.slice(-4)
          compreMessages = compreMessages.slice(0, -4)
        } else {
          history = []
        }
        if (compreMessages.length) {
          summary = await this.compreTokena({
            model: client(chat.model!),
            messages: compreMessages,
            previousSummary: summary
          })
          chat.summary = summary
          await db
            .update(chats)
            .set({
              summary,
              messageOffset: increment(
                chats.messageOffset,
                compreMessages.length
              )
            })
            .where(eq(chats.id, chat.id))
        }
      }
      history.map((m) => {
        const msg: UIMessage = {
          id: m.id,
          role: m.role as 'user' | 'assistant',
          parts: []
        }
        if (m.role === 'user') {
          let text = m.text
          text = addDocsContext(text!, m.docs as any)
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
    const userMsg: UIMessage = {
      id: userMessage.id,
      role: 'user',
      parts: [
        {
          type: 'text',
          text: addDocsContext(userMessage.text!, userMessage.docs as any)
        }
      ]
    }
    if (data.images?.length) {
      userMsg.parts.push({
        type: 'file',
        url: data.images[0],
        mediaType: 'image/png',
        filename: 'photo.png'
      })
    }
    uiMessages.push(userMsg)
    return {
      uiMessages,
      summary,
      chat,
      client,
      assistantMessage,
      assistant,
      userMsg
    }
  }

  static getSystemPromp(ctx: { summary?: string | null; images?: string[] }) {
    let prompt = ''
    if (ctx.images?.length) {
      prompt += `\nIf the user provides an image, please return detailed information such as a summary of the content, key objects, scene, colors, layout, and text content to facilitate use in subsequent conversations.`
    }
    if (ctx.summary) {
      prompt += `This is a summary of the previous conversation: ${ctx.summary}`
    }

    //     if (ctx.tools?.['webSearch']) {
    //       prompt += `\n\nIf you need the latest information to answer user questions, you can choose to use "webSearch" tools. When you call the "webSearch" tool, please follow the following format to output the answer:
    // When using a search result, mark the source address after the corresponding sentence, such as: [source](https://apple.com/mackbook)
    // If a sentence is based on your own knowledge (not search results), do not add the source`
    //     }
    return prompt || undefined
  }
}

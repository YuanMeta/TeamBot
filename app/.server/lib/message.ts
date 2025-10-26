import { generateText, type LanguageModel, type Tool, type UIMessage } from 'ai'
import { prisma } from './prisma'
import { TRPCError } from '@trpc/server'
import type { MessagePart } from '~/types'
import type { Message } from '@prisma/client'
import { createClient } from './checkConnect'
import dayjs from 'dayjs'

let maxTokens = 5000
export class MessageManager {
  static async compreTokena(data: {
    model: LanguageModel
    messages: Message[]
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
      maxOutputTokens: 1200,
      prompt: `${data.previousSummary ? `Previous summary:\n ${data.previousSummary}\n\n` : ''}Conversation:\n ${JSON.stringify(conversation)}`
    })
    return res.text
  }

  static async getStreamMessage(chatId: string) {
    const chat = await prisma.chat.findUnique({
      where: {
        // 后续加入userId 条件
        id: chatId
      },
      include: { assistant: true }
    })
    if (!chat) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Chat not found'
      })
    }
    let messages = await prisma.message.findMany({
      where: {
        chatId: chat.id
      },
      skip: chat.messageOffset,
      orderBy: {
        createdAt: 'asc'
      }
    })

    if (!messages.length) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No messages found'
      })
    }
    const client = createClient({
      mode: chat.assistant!.mode,
      apiKey: chat.assistant!.apiKey,
      baseUrl: chat.assistant!.baseUrl
    })!
    let summary = chat.summary
    const [userMessage, assistantMessage] = messages.slice(-2)
    const uiMessages: UIMessage[] = []
    if (messages.length > 2) {
      let history = messages.slice(0, -2)
      const tokens = messages.reduce(
        (tokens, msg) => tokens + (msg.total_tokens || 0),
        0
      )
      if (tokens > maxTokens && messages.length > 2) {
        let compreMessages = history.slice()
        if (
          history.length > 4 &&
          (history.reverse().find((m) => m.role === 'assistant')
            ?.total_tokens || 0) < maxTokens
        ) {
          // 保留最后一轮对话
          history = history.slice(-2)
          compreMessages = compreMessages.slice(0, -2)
        }
        if (compreMessages.length) {
          summary = await this.compreTokena({
            model: client(chat.model!),
            messages: compreMessages,
            previousSummary: summary
          })
          chat.summary = summary
          await prisma.chat.update({
            where: { id: chat.id },
            data: {
              summary,
              messageOffset: {
                increment: compreMessages.length
              }
            }
          })
        }
      }
      history.slice(0, -2).map((m) => {
        const msg: UIMessage = {
          id: m.id,
          role: m.role as 'user' | 'assistant',
          parts: []
        }
        let parts = m.parts as unknown as MessagePart[]
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
        uiMessages.push(msg)
      })
    }
    uiMessages.push({
      id: userMessage.id,
      role: 'user',
      parts: [
        {
          type: 'text',
          text: (userMessage.parts as MessagePart[])?.[0]?.text! || ''
        }
      ]
    })
    return { uiMessages, summary, chat, client, assistantMessage }
  }

  static getSystemPromp(ctx: {
    summary?: string | null
    tools?: Record<string, Tool>
  }) {
    let prompt = ''
    if (ctx.summary) {
      prompt += `This is a summary of the previous conversation: ${ctx.summary}`
    }
    if (ctx.tools?.['webSearch']) {
      prompt += `\n\nWhen you call the "webSearch" tool, please follow the following format to output the answer:
When using a search result, mark the source address after the corresponding sentence, such as: [source](https://apple.com/mackbook)
If a sentence is based on your own knowledge (not search results), do not add the source`
    }
    return prompt ? prompt : undefined
  }
}

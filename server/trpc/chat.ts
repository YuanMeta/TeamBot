import { TRPCError, type TRPCRouterRecord } from '@trpc/server'
import { procedure } from './core'
import z from 'zod'
import dayjs from 'dayjs'
import { aesDecrypt, tid } from 'server/lib/utils'
import { unlink } from 'fs/promises'
import { join } from 'path'
import {
  chats,
  messages,
  roleAssistants,
  roles,
  userRoles,
  users
} from 'server/db/drizzle/schema'
import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm'
import { addTokens, checkAllowUseAssistant, parseRecord } from 'server/db/query'
import {
  compressSearchResults,
  extractOrDetermineSearch
} from 'server/lib/prompt'
import { runWebSearch } from 'server/lib/search'
export const chatRouter = {
  getMsgContext: procedure.input(z.string()).query(async ({ input, ctx }) => {
    const msg = await ctx.db.query.messages.findFirst({
      columns: { context: true },
      where: { id: input, userId: ctx.userId }
    })
    return { context: msg?.context }
  }),
  searchWeb: procedure
    .input(
      z.object({
        keyword: z.string(),
        query: z.string(),
        webSearchId: z.number(),
        assistantId: z.number(),
        model: z.string()
      })
    )
    .query(async ({ input, ctx }) => {
      const assistant = await ctx.db.query.assistants.findFirst({
        where: { id: input.assistantId }
      })
      if (!assistant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assistant not found'
        })
      }
      const data = await ctx.db.query.webSearches.findFirst({
        where: { id: input.webSearchId }
      })
      if (!data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Web search tool not found'
        })
      }
      const searchResults = await runWebSearch(input.keyword, {
        apiKey: data.params.apiKey,
        cseId: data.params.cseId,
        mode: data.mode
      })
      if (!searchResults) {
        return { results: [], summary: null }
      }
      let summary: string | null = null
      if (assistant.options.compressSearchResults) {
        const res = await compressSearchResults({
          assistant: {
            apiKey: assistant.apiKey
              ? await aesDecrypt(assistant.apiKey)
              : null,
            baseUrl: assistant.baseUrl,
            mode: assistant.mode
          },
          model: input.model,
          query: input.query,
          searchResults: searchResults
        })
        summary = res.summary
        await addTokens(ctx.db, {
          assistantId: assistant.id,
          usage: res.usage,
          model: input.model
        })
      }

      return { results: searchResults!, summary }
    }),
  getSearchInfoByQuestion: procedure
    .input(
      z.object({
        assistantId: z.number(),
        model: z.string(),
        question: z.string()
      })
    )
    .query(async ({ input, ctx }) => {
      const allow = await checkAllowUseAssistant(
        ctx.db,
        ctx.userId,
        input.assistantId
      )
      if (!allow) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'permission denied'
        })
      }
      const assistant = await ctx.db.query.assistants.findFirst({
        where: { id: input.assistantId }
      })
      if (!assistant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assistant not found'
        })
      }

      const res = await extractOrDetermineSearch({
        assistant: {
          mode: assistant.mode,
          apiKey: assistant.apiKey,
          baseUrl: assistant.baseUrl
        },
        model: input.model,
        query: input.question,
        historyQuery: []
      })
      if (res.usage) {
        await addTokens(ctx.db, {
          assistantId: assistant.id,
          usage: res.usage,
          model: input.model
        })
      }
      return res.query
    }),
  createChat: procedure
    .input(
      z.object({
        userMessageId: z.string().min(1),
        assistantMessageId: z.string().min(1),
        assistantId: z.number(),
        model: z.string().optional(),
        context: z
          .object({
            docs: z
              .array(
                z.object({
                  name: z.string(),
                  content: z.string()
                })
              )
              .optional(),
            searchResult: z
              .object({
                query: z.string(),
                results: z.array(z.any()).optional(),
                error: z.string().optional()
              })
              .optional()
          })
          .nullish(),
        userPrompt: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const date = new Date()
      return await ctx.db.transaction(async (t) => {
        const [chat] = await t
          .insert(chats)
          .values({
            id: tid(),
            assistantId: input.assistantId,
            userId: ctx.userId,
            title: '',
            model: input.model
          })
          .returning({
            id: chats.id,
            title: chats.title,
            model: chats.model,
            assistantId: chats.assistantId,
            createdAt: chats.createdAt,
            lastChatTime: chats.lastChatTime
          })
        const [userMessage] = await t
          .insert(messages)
          .values({
            id: input.userMessageId,
            chatId: chat.id,
            role: 'user',
            text: input.userPrompt,
            context: input.context,
            userId: ctx.userId,
            createdAt: date
          })
          .returning()
        const [assistantMessage] = await t
          .insert(messages)
          .values({
            id: input.assistantMessageId,
            chatId: chat.id,
            role: 'assistant',
            userId: ctx.userId,
            createdAt: dayjs(date).add(1, 'second').toDate()
          })
          .returning()
        const messagesData = [userMessage, assistantMessage]
        return { chat: chat, messages: messagesData }
      })
    }),
  getChats: procedure
    .input(
      z.object({
        offset: z.int().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.chats.findMany({
        columns: {
          id: true,
          title: true,
          model: true,
          assistantId: true,
          lastChatTime: true
        },
        where: {
          userId: ctx.userId
        },
        orderBy: {
          lastChatTime: 'desc'
        },
        offset: input.offset || 0,
        limit: 50
      })
    }),
  getChat: procedure
    .input(
      z.object({
        id: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      const chat = await ctx.db.query.chats.findFirst({
        columns: {
          id: true,
          title: true,
          model: true,
          assistantId: true,
          lastChatTime: true
        },
        where: {
          id: input.id,
          userId: ctx.userId
        }
      })
      return chat || null
    }),
  getMessages: procedure
    .input(
      z.object({
        chatId: z.string(),
        offset: z.number()
      })
    )
    .query(async ({ ctx, input }) => {
      const messages = await ctx.db.query.messages.findMany({
        where: {
          chatId: input.chatId,
          userId: ctx.userId
        },
        orderBy: {
          createdAt: 'desc'
        },
        offset: input.offset,
        limit: 10
      })
      return {
        messages: messages.map((m) => parseRecord(m)),
        loadMore: messages.length === 10
      }
    }),
  deleteChat: procedure
    .input(
      z.object({
        id: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.transaction(async (t) => {
        const msgs = await t
          .select({
            files: messages.files
          })
          .from(messages)
          .where(
            and(eq(messages.chatId, input.id), eq(messages.userId, ctx.userId))
          )
        for (let m of msgs) {
          if (m.files?.length) {
            for (let f of m.files) {
              await unlink(join(process.cwd(), 'files', f))
            }
          }
        }
        await t
          .delete(messages)
          .where(
            and(eq(messages.chatId, input.id), eq(messages.userId, ctx.userId))
          )
        await t
          .delete(chats)
          .where(and(eq(chats.id, input.id), eq(chats.userId, ctx.userId)))
        return { success: true }
      })
    }),
  getAssistants: procedure.query(async ({ ctx }) => {
    let allAssistant = ctx.root
    let assistantIds: number[] = []
    if (!allAssistant) {
      const [record] = await ctx.db
        .select({ id: roles.id })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(
          and(eq(userRoles.userId, ctx.userId), eq(roles.allAssistants, true))
        )
      allAssistant = !!record
    }
    if (!allAssistant) {
      const roleIds = await ctx.db
        .select({
          roleId: userRoles.roleId
        })
        .from(users)
        .innerJoin(userRoles, eq(users.id, userRoles.userId))
        .where(eq(users.id, ctx.userId))
      const ids = await ctx.db
        .select({
          assistantId: roleAssistants.assistantId
        })
        .from(roleAssistants)
        .where(
          inArray(
            roleAssistants.roleId,
            roleIds.map((r) => r.roleId)
          )
        )
      if (!assistantIds.length) {
        return []
      }
      assistantIds = ids.map((r) => r.assistantId)
    }
    return ctx.db.query.assistants.findMany({
      columns: {
        id: true,
        mode: true,
        models: true,
        name: true,
        options: true,
        webSearchId: true
      },
      where: allAssistant
        ? undefined
        : {
            id: { in: assistantIds }
          }
    })
  }),
  getTools: procedure.query(async ({ ctx }) => {
    return ctx.db.query.tools.findMany({
      columns: {
        id: true,
        name: true,
        description: true,
        type: true
      }
    })
  }),
  createMessages: procedure
    .input(
      z.object({
        chatId: z.string(),
        userPrompt: z.string().optional(),
        userMessageId: z.string().min(1),
        assistantMessageId: z.string().min(1),
        context: z
          .object({
            docs: z
              .array(
                z.object({
                  name: z.string(),
                  content: z.string()
                })
              )
              .optional(),
            searchResult: z
              .object({
                query: z.string(),
                results: z.array(z.any()).optional(),
                error: z.string().optional()
              })
              .optional()
          })
          .nullish()
      })
    )
    .mutation(async ({ input, ctx }) => {
      let date = new Date()
      const chat = await ctx.db.query.chats.findFirst({
        columns: {
          id: true
        },
        where: {
          id: input.chatId,
          userId: ctx.userId
        }
      })

      if (!chat) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Chat not found'
        })
      }

      return ctx.db.transaction(async (t) => {
        const [userMessage] = await t
          .insert(messages)
          .values({
            id: input.userMessageId,
            chatId: input.chatId,
            role: 'user',
            userId: ctx.userId,
            createdAt: date,
            text: input.userPrompt,
            context: input.context
          })
          .returning()

        const [aiMessage] = await t
          .insert(messages)
          .values({
            id: input.assistantMessageId,
            chatId: input.chatId,
            role: 'assistant',
            userId: ctx.userId,
            createdAt: dayjs(date).add(1, 'second').toDate()
          })
          .returning()

        const messagesData = [userMessage, aiMessage]
        return { messages: messagesData }
      })
    }),
  updateMessage: procedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          error: z.string().optional(),
          terminated: z.boolean().optional(),
          model: z.string().optional(),
          context: z.record(z.string(), z.any()).optional(),
          userPrompt: z.string().optional(),
          parts: z.array(z.record(z.string(), z.any())).optional()
        })
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(messages)
        .set({
          ...input.data,
          parts: input.data.parts ? JSON.stringify(input.data.parts) : null
        })
        .where(and(eq(messages.id, input.id), eq(messages.userId, ctx.userId)))
      return { success: true }
    }),
  updateChat: procedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          model: z.string().optional(),
          assistantId: z.number().nullish(),
          title: z.string().optional(),
          public: z.boolean().optional(),
          messageOffset: z.number().optional(),
          summary: z.string().optional()
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(chats)
        .set(input.data)
        .where(and(eq(chats.id, input.id), eq(chats.userId, ctx.userId)))
      return { success: true }
    }),
  regenerate: procedure
    .input(
      z.object({
        chatId: z.string(),
        removeMessages: z.string().array(),
        offset: z.number(),
        aiMessageId: z.string(),
        userMessage: z
          .object({
            msgId: z.string(),
            prompt: z.string()
          })
          .optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.transaction(async (t) => {
        const [chat] = await t
          .select()
          .from(chats)
          .where(and(eq(chats.id, input.chatId), eq(chats.userId, ctx.userId)))
        if (!chat) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Chat not found'
          })
        }
        if (chat.messageOffset >= input.offset) {
          const offset = input.offset > 2 ? input.offset - 2 : 0
          await t
            .update(chats)
            .set({ messageOffset: offset })
            .where(eq(chats.id, input.chatId))
        }
        if (input.removeMessages.length) {
          await t
            .delete(messages)
            .where(
              and(
                eq(messages.chatId, input.chatId),
                eq(messages.userId, ctx.userId),
                inArray(messages.id, input.removeMessages)
              )
            )
        }
        if (input.userMessage) {
          const oldUserMsg = await t.query.messages.findFirst({
            columns: { context: true },
            where: {
              id: input.userMessage.msgId
            }
          })
          await t
            .update(messages)
            .set({
              text: input.userMessage.prompt,
              context: {
                ...oldUserMsg?.context,
                toolCallOriginData: {}
              }
            })
            .where(
              and(
                eq(messages.id, input.userMessage.msgId),
                eq(messages.userId, ctx.userId),
                eq(messages.chatId, input.chatId),
                eq(messages.role, 'user')
              )
            )
        }
        await t
          .update(messages)
          .set({
            terminated: false,
            error: null,
            parts: null,
            steps: null,
            text: null,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            reasoningTokens: 0,
            cachedInputTokens: 0
          })
          .where(
            and(
              eq(messages.id, input.aiMessageId),
              eq(messages.userId, ctx.userId),
              eq(messages.role, 'assistant'),
              eq(messages.chatId, input.chatId)
            )
          )
        return { success: true }
      })
    }),
  searchChat: procedure
    .input(
      z.object({
        query: z.string(),
        page: z.number()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const records = await ctx.db
        .select({
          chat_id: chats.id,
          message_id: messages.id,
          title: chats.title,
          text: messages.text,
          lastChatTime: chats.lastChatTime,
          updatedAt: messages.updatedAt,
          role: messages.role
        })
        .from(chats)
        .leftJoin(messages, eq(chats.id, messages.chatId))
        .where(
          or(
            ilike(messages.text, `%${input.query}%`),
            ilike(chats.title, `%${input.query}%`)
          )
        )
        .offset((input.page - 1) * 10)
        .limit(10)
        .orderBy(desc(chats.lastChatTime))
      const chatsData: {
        id: string
        title: string
        lastChatTime: Date
        messages: {
          id: string
          text: string
          updatedAt: Date
          role: 'user' | 'assistant'
        }[]
      }[] = []
      const chatMap = new Map<string, (typeof chatsData)[number]>()
      for (let r of records) {
        if (!chatMap.has(r.chat_id)) {
          chatMap.set(r.chat_id, {
            id: r.chat_id,
            title: r.title,
            lastChatTime: r.lastChatTime!,
            messages: r.text?.toLowerCase().includes(input.query.toLowerCase())
              ? [
                  {
                    id: r.message_id!,
                    text: r.text!,
                    updatedAt: r.updatedAt!,
                    role: r.role as 'user' | 'assistant'
                  }
                ]
              : []
          })
        } else {
          if (r.text?.toLowerCase().includes(input.query.toLowerCase())) {
            chatMap.get(r.chat_id)!.messages.push({
              id: r.message_id!,
              text: r.text!,
              updatedAt: r.updatedAt!,
              role: r.role as 'user' | 'assistant'
            })
          }
        }
      }
      return Array.from(chatMap.values())
    })
} satisfies TRPCRouterRecord

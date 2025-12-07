import { TRPCError, type TRPCRouterRecord } from '@trpc/server'
import { procedure } from './core'
import z from 'zod'
import dayjs from 'dayjs'
import { tid } from 'server/lib/utils'
import { parseRecord } from 'server/lib/db/table'
import { unlink } from 'fs/promises'
import { join } from 'path'
export const chatRouter = {
  createChat: procedure
    .input(
      z.object({
        userMessageId: z.string().min(1),
        assistantMessageId: z.string().min(1),
        assistantId: z.number(),
        model: z.string().optional(),
        docs: z
          .array(
            z.object({
              name: z.string(),
              content: z.string()
            })
          )
          .optional(),
        userPrompt: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const date = new Date()
      return await ctx.db.transaction().execute(async (trx) => {
        const chat = await trx
          .insertInto('chats')
          .values({
            id: tid(),
            assistant_id: input.assistantId,
            user_id: ctx.userId,
            title: '',
            model: input.model
          })
          .returning([
            'id',
            'title',
            'model',
            'assistant_id',
            'created_at',
            'updated_at',
            'last_chat_time'
          ])
          .execute()

        const userMessage = await trx
          .insertInto('messages')
          .values({
            id: input.userMessageId,
            chat_id: chat[0].id,
            role: 'user',
            text: input.userPrompt,
            docs: input.docs ? JSON.stringify(input.docs) : null,
            user_id: ctx.userId,
            created_at: date
          })
          .returningAll()
          .execute()

        let userFiles: Array<{
          id: string
          name: string
          path: string
          size: number
        }> = []

        const assistantMessage = await trx
          .insertInto('messages')
          .values({
            id: input.assistantMessageId,
            chat_id: chat[0].id,
            role: 'assistant',
            user_id: ctx.userId,
            created_at: dayjs(date).add(1, 'second').toDate()
          })
          .returningAll()
          .execute()

        const messages = [
          { ...userMessage[0], files: userFiles },
          { ...assistantMessage[0], files: [] }
        ]

        return { chat: chat[0], messages }
      })
    }),
  getChats: procedure
    .input(
      z.object({
        offset: z.int().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db
        .selectFrom('chats')
        .where('user_id', '=', ctx.userId)
        .where('deleted', '=', false)
        .offset(input.offset || 0)
        .limit(50)
        .orderBy('last_chat_time', 'desc')
        .select(['id', 'title', 'model', 'assistant_id', 'last_chat_time'])
        .execute()
    }),
  getChat: procedure
    .input(
      z.object({
        id: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      const chat = await ctx.db
        .selectFrom('chats')
        .where('id', '=', input.id)
        .where('user_id', '=', ctx.userId)
        .select(['id', 'title', 'model', 'assistant_id', 'last_chat_time'])
        .executeTakeFirst()
      if (!chat) {
        return null
      }
      return chat
    }),
  getMessages: procedure
    .input(
      z.object({
        chatId: z.string(),
        offset: z.number()
      })
    )
    .query(async ({ ctx, input }) => {
      const messages = await ctx.db
        .selectFrom('messages')
        .where('chat_id', '=', input.chatId)
        .where('user_id', '=', ctx.userId)
        .offset(input.offset)
        .limit(10)
        .orderBy('created_at', 'desc')
        .selectAll()
        .execute()
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
      return ctx.db.transaction().execute(async (trx) => {
        const messages = await trx
          .selectFrom('messages')
          .where('chat_id', '=', input.id)
          .where('user_id', '=', ctx.userId)
          .select(['files'])
          .execute()
        for (let m of messages) {
          if (m.files) {
            try {
              const files = JSON.parse(m.files as any) as string[]
              for (let f of files) {
                await unlink(join(process.cwd(), 'files', f))
              }
            } catch (e) {
              console.error(e)
            }
          }
        }
        await trx
          .deleteFrom('messages')
          .where('chat_id', '=', input.id)
          .where('user_id', '=', ctx.userId)
          .execute()
        await trx
          .deleteFrom('chats')
          .where('id', '=', input.id)
          .where('user_id', '=', ctx.userId)
          .execute()
        return { success: true }
      })
    }),
  getAssistants: procedure.query(async ({ ctx }) => {
    let query = ctx.db.selectFrom('assistants')
    // 是否拥有所有助手
    const allAssistant = await ctx.db
      .selectFrom('user_roles')
      .innerJoin('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', '=', ctx.userId)
      .where('roles.all_assistants', '=', true)
      .select('role_id')
      .executeTakeFirst()

    if (!allAssistant) {
      const assistantsIds = await ctx.db
        .selectFrom('user_roles')
        .innerJoin('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', '=', ctx.userId)
        .select(['roles.assistants'])
        .execute()
      let ids: number[] = assistantsIds.flatMap((r) => r.assistants)
      if (!ids.length) {
        return []
      }
      query = query.where('id', 'in', ids)
    }
    const assistants = await query
      .select(['id', 'name', 'mode', 'models', 'options'])
      .execute()
    let toolsMap = new Map<number, string[]>()
    if (assistants.length) {
      const tools = await ctx.db
        .selectFrom('assistant_tools')
        .where(
          'assistant_id',
          'in',
          assistants.map((a) => a.id)
        )
        .select(['tool_id', 'assistant_id'])
        .execute()
      for (let t of tools) {
        if (!t.tool_id) continue
        toolsMap.set(t.assistant_id, [
          ...(toolsMap.get(t.assistant_id) || []),
          t.tool_id
        ])
      }
    }
    return assistants.map((a) => ({
      ...a,
      tools: toolsMap.get(a.id) || []
    }))
  }),
  getTools: procedure.query(async ({ ctx }) => {
    return ctx.db
      .selectFrom('tools')
      .where((eb) =>
        eb.or([eb('auto', '=', false), eb('type', '=', 'web_search')])
      )
      .select(['id', 'name', 'description', 'type'])
      .execute()
  }),
  createMessages: procedure
    .input(
      z.object({
        chatId: z.string(),
        userPrompt: z.string().optional(),
        userMessageId: z.string().min(1),
        assistantMessageId: z.string().min(1),
        docs: z
          .array(
            z.object({
              name: z.string(),
              content: z.string()
            })
          )
          .optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      let date = new Date()
      const chat = await ctx.db
        .selectFrom('chats')
        .where('id', '=', input.chatId)
        .where('user_id', '=', ctx.userId)
        .select(['id'])
        .executeTakeFirst()

      if (!chat) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Chat not found'
        })
      }

      return ctx.db.transaction().execute(async (trx) => {
        const userMessage = await trx
          .insertInto('messages')
          .values({
            id: input.userMessageId,
            chat_id: input.chatId,
            role: 'user',
            user_id: ctx.userId,
            created_at: date,
            text: input.userPrompt,
            docs: input.docs ? JSON.stringify(input.docs) : null
          } as any)
          .returningAll()
          .execute()

        let userFiles: Array<{
          id: string
          name: string
          path: string
          size: number
        }> = []
        const aiMessage = await trx
          .insertInto('messages')
          .values({
            id: input.assistantMessageId,
            chat_id: input.chatId,
            role: 'assistant',
            user_id: ctx.userId,
            created_at: dayjs(date).add(1, 'second').toDate()
          })
          .returningAll()
          .execute()

        const messages = [
          { ...userMessage[0], files: userFiles },
          { ...aiMessage[0], files: [] }
        ]

        return { messages }
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
        .updateTable('messages')
        .set({
          ...input.data,
          parts: input.data.parts ? JSON.stringify(input.data.parts) : null
        })
        .where('id', '=', input.id)
        .where('user_id', '=', ctx.userId)
        .returning(['id'])
        .execute()
      return { success: true }
    }),
  updateChat: procedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          model: z.string().optional(),
          assistant_id: z.number().nullish(),
          title: z.string().optional(),
          public: z.boolean().optional(),
          message_offset: z.number().optional(),
          summary: z.string().optional()
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .updateTable('chats')
        .set(input.data)
        .where('id', '=', input.id)
        .where('user_id', '=', ctx.userId)
        .returning(['id'])
        .execute()
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
      return ctx.db.transaction().execute(async (trx) => {
        const chat = await trx
          .selectFrom('chats')
          .where('user_id', '=', ctx.userId)
          .where('id', '=', input.chatId)
          .selectAll()
          .executeTakeFirst()
        if (!chat) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Chat not found'
          })
        }
        if (chat.message_offset >= input.offset) {
          const offset = input.offset > 2 ? input.offset - 2 : 0
          await trx
            .updateTable('chats')
            .set({ message_offset: offset })
            .where('id', '=', input.chatId)
            .execute()
        }
        if (input.removeMessages.length) {
          await trx
            .deleteFrom('messages')
            .where('chat_id', '=', input.chatId)
            .where('user_id', '=', ctx.userId)
            .where('id', 'in', input.removeMessages)
            .execute()
        }
        if (input.userMessage) {
          await trx
            .updateTable('messages')
            .set({
              text: input.userMessage.prompt
            })
            .where('id', '=', input.userMessage.msgId)
            .where('user_id', '=', ctx.userId)
            .where('chat_id', '=', input.chatId)
            .where('role', '=', 'user')
            .execute()
        }
        await trx
          .updateTable('messages')
          .set({
            terminated: false,
            error: null,
            parts: null,
            steps: null,
            text: null,
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
            reasoning_tokens: 0,
            cached_input_tokens: 0
          })
          .where('id', '=', input.aiMessageId)
          .where('user_id', '=', ctx.userId)
          .where('role', '=', 'assistant')
          .where('chat_id', '=', input.chatId)
          .execute()
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
      const record = await ctx.db
        .selectFrom('chats')
        .innerJoin('messages', 'chats.id', 'messages.chat_id')
        .where('chats.user_id', '=', ctx.userId)
        .where((eb) =>
          eb.or([
            eb('messages.text', 'like', `%${input.query}%`),
            eb('chats.title', 'like', `%${input.query}%`)
          ])
        )
        .orderBy('chats.last_chat_time', 'desc')
        .offset((input.page - 1) * 10)
        .limit(10)
        .select([
          'chats.id as chat_id',
          'messages.id as message_id',
          'chats.title as title',
          'messages.text as text',
          'chats.last_chat_time as last_chat_time',
          'messages.updated_at as updated_at',
          'messages.role as role'
        ])
        .execute()
      const chats: {
        id: string
        title: string
        last_chat_time: Date
        messages: {
          id: string
          text: string
          updated_at: Date
          role: 'user' | 'assistant'
        }[]
      }[] = []
      const chatMap = new Map<string, (typeof chats)[number]>()
      for (let r of record) {
        if (!chatMap.has(r.chat_id)) {
          chatMap.set(r.chat_id, {
            id: r.chat_id,
            title: r.title,
            last_chat_time: r.last_chat_time!,
            messages: r.text?.toLowerCase().includes(input.query.toLowerCase())
              ? [
                  {
                    id: r.message_id,
                    text: r.text!,
                    updated_at: r.updated_at!,
                    role: r.role as 'user' | 'assistant'
                  }
                ]
              : []
          })
        } else {
          if (r.text?.toLowerCase().includes(input.query.toLowerCase())) {
            chatMap.get(r.chat_id)!.messages.push({
              id: r.message_id,
              text: r.text!,
              updated_at: r.updated_at!,
              role: r.role as 'user' | 'assistant'
            })
          }
        }
      }
      return Array.from(chatMap.values())
    })
} satisfies TRPCRouterRecord

import { TRPCError, type TRPCRouterRecord } from '@trpc/server'
import { procedure } from './core'
import z from 'zod'
import dayjs from 'dayjs'
import { tid } from 'server/lib/utils'
import type { TableChat } from 'types/table'
import { insertRecord, parseRecord } from 'server/lib/table'
import { getMessagesWithFiles } from './query'
// import { getMessagesWithFiles } from '../lib/table'
export const chatRouter = {
  createChat: procedure
    .input(
      z.object({
        userMessageId: z.string().min(1),
        assistantMessageId: z.string().min(1),
        assistantId: z.string().min(1),
        model: z.string().optional(),
        files: z
          .array(
            z.object({
              path: z.string(),
              name: z.string(),
              size: z.number()
            })
          )
          .optional(),
        userPrompt: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const date = new Date()
      ctx.db('users').select
      return await ctx.db.transaction(async (trx) => {
        const chat = await trx('chats')
          .insert({
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
        const userMessage = await trx('messages')
          .insert({
            id: input.userMessageId,
            chat_id: chat[0].id,
            role: 'user',
            parts: JSON.stringify([
              {
                type: 'text',
                text: input.userPrompt
              }
            ]) as any,
            user_id: ctx.userId,
            created_at: date
          })
          .returning('*')

        let userFiles: Array<{
          id: string
          name: string
          path: string
          size: number
        }> = []
        if (input.files) {
          const insertedFiles = await trx('message_files')
            .insert(
              input.files.map((file) => {
                return {
                  message_id: userMessage[0].id,
                  user_id: ctx.userId,
                  name: file.name,
                  path: file.path,
                  size: file.size,
                  origin: 'file'
                }
              })
            )
            .returning(['id', 'name', 'path', 'size'])
          userFiles = insertedFiles
        }

        const assistantMessage = await trx('messages')
          .insert({
            id: input.assistantMessageId,
            chat_id: chat[0].id,
            role: 'assistant',
            user_id: ctx.userId,
            created_at: dayjs(date).add(1, 'second').toDate()
          })
          .returning('*')

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
      return ctx
        .db('chats')
        .where({
          user_id: ctx.userId,
          deleted: false
        })
        .offset(input.offset || 0)
        .limit(50)
        .orderBy('last_chat_time', 'desc')
        .select('id', 'title', 'model', 'assistant_id', 'last_chat_time')
    }),
  getChat: procedure
    .input(
      z.object({
        id: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      const messages = await getMessagesWithFiles(ctx.db, {
        chatId: input.id,
        userId: ctx.userId,
        page: 1
      })
      const chat = await ctx
        .db('chats')
        .where({
          id: input.id,
          user_id: ctx.userId
        })
        .select('id', 'title', 'model', 'assistant_id', 'last_chat_time')

      if (!chat || chat.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Chat not found'
        })
      }
      return {
        ...chat[0],
        messages: messages
      }
    }),
  getMessages: procedure
    .input(
      z.object({
        chatId: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      return getMessagesWithFiles(ctx.db, {
        chatId: input.chatId,
        userId: ctx.userId,
        page: 1
      })
    }),
  deleteChat: procedure
    .input(
      z.object({
        id: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx
        .db('chats')
        .where({ id: input.id, user_id: ctx.userId })
        .update({ deleted: true })
        .returning(['id', 'title', 'deleted'])
    }),
  getAssistants: procedure.query(async ({ ctx }) => {
    const assistants = await ctx
      .db('assistants')
      .select('id', 'name', 'mode', 'models', 'options')
    return assistants.map((a) => {
      const data = parseRecord(a as any)
      return {
        ...data,
        options: data.options?.searchMode
      }
    })
  }),
  createMessages: procedure
    .input(
      z.object({
        chatId: z.string(),
        userPrompt: z.string().optional(),
        files: z
          .array(
            z.object({
              path: z.string(),
              size: z.number(),
              name: z.string()
            })
          )
          .optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      let date = new Date()
      const chat = await ctx
        .db('chats')
        .where({ id: input.chatId, user_id: ctx.userId })
        .select('id')
        .first()

      if (!chat) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Chat not found'
        })
      }

      return ctx.db.transaction(async (trx) => {
        const userMessage = await trx('messages')
          .insert({
            chat_id: input.chatId,
            role: 'user',
            user_id: ctx.userId,
            created_at: date,
            parts: [
              {
                type: 'text',
                text: input.userPrompt
              }
            ]
          })
          .returning('*')

        let userFiles: Array<{
          id: string
          name: string
          path: string
          size: number
        }> = []
        if (input.files && input.files.length > 0) {
          const insertedFiles = await trx('message_files')
            .insert(
              input.files.map((file) => {
                return {
                  message_id: userMessage[0].id,
                  user_id: ctx.userId,
                  name: file.name,
                  path: file.path,
                  size: file.size,
                  origin: 'file'
                }
              })
            )
            .returning(['id', 'name', 'path', 'size'])
          userFiles = insertedFiles
        }

        const aiMessage = await trx('messages')
          .insert({
            chat_id: input.chatId,
            role: 'assistant',
            user_id: ctx.userId,
            created_at: dayjs(date).add(1, 'second').toDate()
          })
          .returning('*')

        await trx('chats')
          .where({ id: input.chatId, user_id: ctx.userId })
          .update({ last_chat_time: new Date().toISOString() })

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
    .mutation(({ ctx, input }) => {
      return ctx
        .db('messages')
        .where({ id: input.id, user_id: ctx.userId })
        .update(insertRecord(input.data))
        .returning('*')
    }),
  updateChat: procedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          model: z.string().optional(),
          assistantId: z.string().optional(),
          title: z.string().optional(),
          public: z.boolean().optional(),
          messageOffset: z.number().optional(),
          summary: z.string().optional()
        })
      })
    )
    .mutation(({ input, ctx }) => {
      return ctx
        .db('chats')
        .where({ id: input.id, user_id: ctx.userId })
        .update(input.data)
        .returning('*')
    }),
  getUserInfo: procedure.query(async ({ ctx }) => {
    return ctx
      .db('users')
      .where({ id: ctx.userId })
      .select('name', 'email', 'role')
      .first()
  })
} satisfies TRPCRouterRecord

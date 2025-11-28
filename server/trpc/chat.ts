import { TRPCError, type TRPCRouterRecord } from '@trpc/server'
import { procedure } from './core'
import z from 'zod'
import dayjs from 'dayjs'
import { tid } from 'server/lib/utils'
import { insertRecord, parseRecord } from 'server/lib/table'
import { getMessagesWithFiles } from './query'
export const chatRouter = {
  createChat: procedure
    .input(
      z.object({
        userMessageId: z.string().min(1),
        assistantMessageId: z.string().min(1),
        assistantId: z.string().min(1),
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
          .insert(
            insertRecord({
              id: input.userMessageId,
              chat_id: chat[0].id,
              role: 'user',
              text: input.userPrompt,
              docs: input.docs,
              user_id: ctx.userId,
              created_at: date
            })
          )
          .returning('*')

        let userFiles: Array<{
          id: string
          name: string
          path: string
          size: number
        }> = []

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
      const chat = await ctx
        .db('chats')
        .where({
          id: input.id,
          user_id: ctx.userId
        })
        .select('id', 'title', 'model', 'assistant_id', 'last_chat_time')
        .first()
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
      return getMessagesWithFiles(ctx.db, {
        chatId: input.chatId,
        userId: ctx.userId,
        offset: input.offset
      })
    }),
  deleteChat: procedure
    .input(
      z.object({
        id: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.transaction(async (trx) => {
        // const files = await trx('message_files')
        //   .where({ chat_id: input.id, user_id: ctx.userId })
        //   .select('id')
        // if (files.length > 0) {
        //   await trx('messages')
        //     .where({ chat_id: input.id, user_id: ctx.userId })
        //     .delete()
        // }
        await trx('messages')
          .where({ chat_id: input.id, user_id: ctx.userId })
          .delete()
        await trx('chats').where({ id: input.id, user_id: ctx.userId }).delete()
      })
    }),
  getAssistants: procedure.query(async ({ ctx }) => {
    const assistants = await ctx
      .db('assistants')
      .select('id', 'name', 'mode', 'models', 'options')
    let data: any[] = []
    for (let a of assistants) {
      const as = parseRecord(a as any)
      const tools = await ctx
        .db('assistant_tools')
        .where({ assistant_id: a.id })
        .select('tool_id')
      as.tools = tools.map((t) => t.tool_id)
      data.push(as)
    }
    return data
  }),
  getTools: procedure.query(async ({ ctx }) => {
    return ctx.db('tools').select('id', 'name', 'description', 'type')
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
            id: input.userMessageId,
            chat_id: input.chatId,
            role: 'user',
            user_id: ctx.userId,
            created_at: date,
            text: input.userPrompt,
            docs: input.docs
          })
          .returning('*')

        let userFiles: Array<{
          id: string
          name: string
          path: string
          size: number
        }> = []
        const aiMessage = await trx('messages')
          .insert({
            id: input.assistantMessageId,
            chat_id: input.chatId,
            role: 'assistant',
            user_id: ctx.userId,
            created_at: dayjs(date).add(1, 'second').toDate()
          })
          .returning('*')

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
        .returning('id')
    }),
  updateChat: procedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          model: z.string().optional(),
          assistant_id: z.string().optional(),
          title: z.string().optional(),
          public: z.boolean().optional(),
          message_offset: z.number().optional(),
          summary: z.string().optional()
        })
      })
    )
    .mutation(({ input, ctx }) => {
      return ctx
        .db('chats')
        .where({ id: input.id, user_id: ctx.userId })
        .update(input.data)
        .returning('id')
    }),
  getUserInfo: procedure.query(async ({ ctx }) => {
    return ctx
      .db('users')
      .where({ id: ctx.userId })
      .select('name', 'email', 'role')
      .first()
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
      return ctx.db.transaction(async (trx) => {
        const chat = await trx('chats')
          .where({
            user_id: ctx.userId,
            id: input.chatId
          })
          .first()
        if (!chat) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Chat not found'
          })
        }
        if (chat.message_offset >= input.offset) {
          const offset = input.offset > 2 ? input.offset - 2 : 0
          await trx('chats')
            .where({ id: input.chatId })
            .update({ message_offset: offset })
        }
        if (input.removeMessages.length) {
          await trx('messages')
            .where({ chat_id: input.chatId, user_id: ctx.userId })
            .whereIn('id', input.removeMessages)
            .delete()
        }
        if (input.userMessage) {
          await trx('messages')
            .where({
              id: input.userMessage.msgId,
              user_id: ctx.userId,
              chat_id: input.chatId,
              role: 'user'
            })
            .update({
              text: input.userMessage.prompt
            })
        }
        await trx('messages')
          .where({
            id: input.aiMessageId,
            user_id: ctx.userId,
            role: 'assistant',
            chat_id: input.chatId
          })
          .update(
            insertRecord({
              terminated: false,
              error: null,
              parts: null,
              steps: {},
              text: null,
              input_tokens: 0,
              output_tokens: 0,
              total_tokens: 0,
              reasoning_tokens: 0,
              cached_input_tokens: 0
            })
          )
      })
    })
} satisfies TRPCRouterRecord

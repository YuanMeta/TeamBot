import { TRPCError, type TRPCRouterRecord } from '@trpc/server'
import { procedure } from './core'
import z from 'zod'
import { type Message } from '@prisma/client'
import dayjs from 'dayjs'
export const chatRouter = {
  createChat: procedure
    .input(
      z.object({
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
      return await ctx.db.$transaction(async (t) => {
        const chat = await t.chat.create({
          data: {
            assistantId: input.assistantId,
            userId: ctx.userId,
            title: '',
            model: input.model
          },
          select: {
            model: true,
            assistantId: true,
            id: true,
            lastChatTime: true,
            title: true
          }
        })
        let messages: Message[] = []
        const userMessage = await t.message.create({
          data: {
            chatId: chat.id,
            role: 'user',
            userId: ctx.userId,
            files: input.files?.length
              ? {
                  createMany: {
                    data: input.files.map((file) => {
                      return {
                        userId: ctx.userId,
                        name: file.name,
                        path: file.path,
                        size: file.size,
                        origin: 'file'
                      }
                    })
                  }
                }
              : undefined,
            parts: [
              {
                type: 'text',
                text: input.userPrompt
              }
            ],
            createdAt: date
          },
          include: { files: true }
        })
        const assistantMessage = await t.message.create({
          data: {
            chatId: chat.id,
            role: 'assistant',
            userId: ctx.userId,
            createdAt: dayjs(date).add(1, 'second').toDate()
          }
        })
        messages.push(userMessage)
        messages.push(assistantMessage)
        return { chat, messages }
      })
    }),
  getChats: procedure
    .input(
      z.object({
        offset: z.int().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.chat.findMany({
        where: {
          userId: ctx.userId,
          deleted: false
        },
        skip: input.offset || 0,
        take: 50,
        select: {
          model: true,
          assistantId: true,
          id: true,
          lastChatTime: true,
          title: true
        },
        orderBy: { lastChatTime: 'desc' }
      })
    }),
  getChat: procedure
    .input(
      z.object({
        id: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.chat.findUnique({
        where: { id: input.id, userId: ctx.userId },
        select: {
          model: true,
          assistantId: true,
          id: true,
          lastChatTime: true,
          title: true,
          messages: {
            select: {
              id: true,
              chatId: true,
              files: {
                select: {
                  id: true,
                  name: true,
                  size: true,
                  path: true
                }
              },
              context: true,
              parts: true,
              createdAt: true,
              updatedAt: true,
              model: true,
              error: true,
              terminated: true,
              role: true
            }
          }
        }
      })
    }),
  getMessages: procedure
    .input(
      z.object({
        chatId: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.message.findMany({
        where: {
          chatId: input.chatId,
          userId: ctx.userId
        },
        select: {
          id: true,
          chatId: true,
          files: {
            select: {
              id: true,
              name: true,
              size: true,
              path: true
            }
          },
          context: true,
          parts: true,
          createdAt: true,
          updatedAt: true,
          model: true,
          error: true,
          terminated: true,
          role: true
        }
      })
    }),
  deleteChat: procedure
    .input(
      z.object({
        id: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.chat.update({
        where: { id: input.id, userId: ctx.userId },
        data: { deleted: true }
      })
    }),
  getAssistants: procedure.query(async ({ ctx }) => {
    const assistants = await ctx.db.assistant.findMany({
      select: {
        id: true,
        name: true,
        mode: true,
        models: true,
        options: true
      }
    })
    return assistants.map((a) => {
      const op = a.options as { searchMode?: string }
      return {
        ...a,
        options: {
          searchMode: op?.searchMode
        }
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
      const chat = await ctx.db.chat.findUnique({
        where: { id: input.chatId, userId: ctx.userId },
        select: { id: true }
      })
      if (!chat) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Chat not found'
        })
      }
      return ctx.db.$transaction(async (t) => {
        let messages: Message[] = []
        const userMessage = await t.message.create({
          data: {
            chatId: input.chatId,
            role: 'user',
            userId: ctx.userId,
            createdAt: date,
            parts: [
              {
                type: 'text',
                text: input.userPrompt
              }
            ],
            files: input.files?.length
              ? {
                  createMany: {
                    data: input.files.map((file) => {
                      return {
                        userId: ctx.userId,
                        name: file.name,
                        path: file.path,
                        size: file.size,
                        origin: 'file'
                      }
                    })
                  }
                }
              : undefined
          },
          include: { files: true }
        })
        const aiMessage = await t.message.create({
          data: {
            chatId: input.chatId,
            role: 'assistant',
            userId: ctx.userId,
            createdAt: dayjs(date).add(1, 'second').toDate()
          }
        })
        messages.push(userMessage)
        messages.push(aiMessage)
        await t.chat.update({
          where: { id: input.chatId, userId: ctx.userId },
          data: { lastChatTime: new Date() }
        })
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
          userPrompt: z.string().optional()
        })
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.message.update({
        where: { id: input.id, userId: ctx.userId },
        data: input.data
      })
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
      return ctx.db.chat.update({
        where: { id: input.id, userId: ctx.userId },
        data: input.data
      })
    }),
  getUserInfo: procedure.query(async ({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { id: ctx.userId },
      select: {
        name: true,
        email: true,
        role: true
      }
    })
  })
} satisfies TRPCRouterRecord

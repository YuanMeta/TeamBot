import type { TRPCRouterRecord } from '@trpc/server'
import { procedure } from './core'
import z from 'zod'
import type { Message } from '@prisma/client'

export const chatRouter = {
  createChat: procedure
    .input(
      z.object({
        assistantId: z.string().min(1),
        model: z.string().optional(),
        messages: z
          .object({
            content: z.string().optional(),
            role: z.enum(['user', 'assistant', 'system']),
            files: z
              .array(
                z.object({
                  path: z.string(),
                  name: z.string(),
                  size: z.number()
                })
              )
              .optional()
          })
          .array()
      })
    )
    .mutation(async ({ input, ctx }) => {
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
        for (let m of input.messages) {
          const message = await t.message.create({
            data: {
              chatId: chat.id,
              content: m.content,
              role: m.role,
              userId: ctx.userId,
              files: m.files?.length
                ? {
                    createMany: {
                      data: m.files.map((file) => {
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
          messages.push(message)
        }
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
          userId: ctx.userId
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
  getMessages: procedure
    .input(
      z.object({
        chatId: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.message.findMany({
        where: {
          chatId: input.chatId
        },
        include: { files: true }
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
        messages: z
          .object({
            chatId: z.string(),
            content: z.string().optional(),
            role: z.enum(['user', 'assistant', 'system']),
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
          .array()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.$transaction(async (t) => {
        let messages: Message[] = []
        for (let m of input.messages) {
          const message = await t.message.create({
            data: {
              chatId: input.chatId,
              content: m.content,
              role: m.role,
              userId: ctx.userId,
              files: m.files?.length
                ? {
                    createMany: {
                      data: m.files.map((file) => {
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
          messages.push(message)
        }
        return { messages }
      })
    }),
  updateMessage: procedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          height: z.number().optional(),
          error: z.string().optional(),
          usage: z.record(z.string(), z.any()).optional(),
          terminated: z.boolean().optional(),
          tools: z.record(z.string(), z.any()).optional(),
          model: z.string().optional(),
          content: z.string().optional(),
          context: z.record(z.string(), z.any()).optional()
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
    })
} satisfies TRPCRouterRecord

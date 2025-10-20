import type { TRPCRouterRecord } from '@trpc/server'
import { procedure } from './core'
import z from 'zod'

export const chatRouter = {
  createChat: procedure
    .input(
      z.object({
        assistantId: z.string().min(1)
      })
    )
    .mutation(async ({ input, ctx }) => {
      // return ctx.db.chat.create({
      //   data: {
      //     assistantId: input.assistantId,
      //     userId: ctx.user.id
      //   }
      // })
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
        select: {
          id: true,
          context: true,
          content: true,
          terminated: true,
          error: true,
          usage: true,
          height: true,
          updatedAt: true,
          model: true,
          files: {
            select: { id: true, path: true, origin: true, size: true }
          },
          role: true,
          createdAt: true
        }
      })
    }),
  createMessage: procedure
    .input(
      z
        .object({
          chatId: z.string(),
          content: z.string(),
          role: z.enum(['user', 'assistant', 'system', 'tool']),
          files: z
            .array(
              z.object({
                path: z.string(),
                size: z.number()
              })
            )
            .optional(),
          context: z.record(z.string(), z.any()).optional()
        })
        .array()
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.message.createMany({
        data: input.map((item) => {
          return {
            chatId: item.chatId,
            content: item.content,
            role: item.role,
            userId: ctx.userId,
            files: item.files?.map((file) => {
              return {
                path: file.path,
                size: file.size
              }
            })
          }
        })
      })
    })
} satisfies TRPCRouterRecord

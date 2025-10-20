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
          id: true,
          lastChatTime: true,
          title: true
        },
        orderBy: { lastChatTime: 'desc' }
      })
    })
} satisfies TRPCRouterRecord

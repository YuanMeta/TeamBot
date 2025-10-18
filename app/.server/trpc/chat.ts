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
    })
} satisfies TRPCRouterRecord

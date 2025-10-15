import type { TRPCRouterRecord } from '@trpc/server'

import { procedure, publicProcedure } from './core'

export const userRouter = {
  hello: publicProcedure.query(() => {
    return 'hello world'
  }),
  user: procedure.query(async ({ input, ctx }) => {
    const user = await ctx.db.user.findFirst({
      where: {
        id: ctx.user?.id
      }
    })

    return user
  })
} satisfies TRPCRouterRecord

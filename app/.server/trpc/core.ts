import { initTRPC, TRPCError } from '@trpc/server'
import { prisma } from '~/.server/lib/prisma'
import { ZodError } from 'zod'
import superjson from 'superjson'
import { appRouter } from './trpc'
import type { LoaderFunctionArgs } from 'react-router'

export async function createTRPCContext(opts: { headers: Headers }) {
  return {
    db: prisma,
    user: null as null | { id: string }
  }
}
type Context = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof ZodError ? error.cause.flatten() : null
    }
  })
})

export const createCallerFactory = t.createCallerFactory
export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

export const procedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user?.id) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      user: ctx.user
    }
  })
})

const createCaller = createCallerFactory(appRouter)
export const caller = async (loaderArgs: LoaderFunctionArgs) =>
  createCaller(await createTRPCContext({ headers: loaderArgs.request.headers }))

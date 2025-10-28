import { initTRPC, TRPCError } from '@trpc/server'
import { prisma } from '../lib/prisma'
import { ZodError } from 'zod'
import superjson from 'superjson'
import { userCookie } from '../session'
import { verifyToken } from '../lib/password'

export async function createTRPCContext({ request }: { request: Request }) {
  const cookie = await userCookie.parse(request.headers.get('Cookie') || '')
  if (!cookie?.token) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  const data = verifyToken(cookie.token)
  if (!data) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return {
    db: prisma,
    userId: data.uid,
    request
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
  // if (!ctx.user?.id) {
  //   throw new TRPCError({ code: 'UNAUTHORIZED' })
  // }
  return next({
    ctx: {
      userId: ctx.userId
    }
  })
})

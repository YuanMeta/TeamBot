import { initTRPC, TRPCError } from '@trpc/server'
import z, { ZodError } from 'zod'
import superjson from 'superjson'
import { userCookie } from '../session'
import { verifyToken } from '../lib/password'
import { kdb } from '../lib/knex'
import * as trpcExpress from '@trpc/server/adapters/express'

export const createContext = async ({
  req
}: trpcExpress.CreateExpressContextOptions) => {
  const db = await kdb()
  return {
    db,
    userId: null as null | string,
    req
  }
}

type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError:
        error.cause instanceof ZodError ? z.treeifyError(error.cause) : null
    }
  })
})

export const createCallerFactory = t.createCallerFactory
export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

export const procedure = t.procedure.use(async ({ ctx, next }) => {
  const token = await userCookie.parse(ctx.req.headers.cookie || '')
  if (!token) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  const data = verifyToken(token)
  if (!data) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  const user = await ctx.db('users').where({ id: data.uid }).first()
  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      userId: data.uid
    }
  })
})

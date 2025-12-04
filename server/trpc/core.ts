import { initTRPC, TRPCError } from '@trpc/server'
import z, { ZodError } from 'zod'
import superjson from 'superjson'
import { verifyUser } from '../session'
import { kdb } from '../lib/knex'
import * as trpcExpress from '@trpc/server/adapters/express'
import { publicAccess } from 'server/lib/db/access'

export const createContext = async ({
  req
}: trpcExpress.CreateExpressContextOptions) => {
  const db = await kdb()
  return {
    db,
    userId: null as null | number,
    req,
    root: false
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
  const user = await verifyUser(ctx.req.headers.cookie || '')
  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      userId: user.id,
      root: user.root
    }
  })
})

export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  const user = await verifyUser(ctx.req.headers.cookie || '')

  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  const paths = ctx.req.path
    .slice(1)
    .split(',')
    .filter((p) => !p.startsWith('chat.'))
  if (user.root || paths.every((p) => publicAccess.includes(p))) {
    return next({
      ctx: {
        ...ctx,
        userId: user.id
      }
    })
  }

  if (paths.length) {
    const uniquePaths = Array.from(new Set(paths))

    const result = await ctx.db.raw(
      `
        SELECT COUNT(DISTINCT path) AS count
        FROM user_roles ur
        JOIN access_roles ar ON ur.role_id = ar.role_id
        JOIN accesses a ON ar.access_id = a.id
        CROSS JOIN LATERAL jsonb_array_elements_text(
          COALESCE(a.trpc_access, '[]'::jsonb)
        ) AS path
        WHERE ur.user_id = ?
          AND path = ANY(?)
      `,
      [user.id, uniquePaths]
    )

    const rows =
      (result as unknown as { rows?: Array<{ count: string | number }> })
        .rows || []
    const matchedCount = rows.length ? Number(rows[0].count) : 0

    if (matchedCount < uniquePaths.length) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: '无权限访问'
      })
    }
  }

  return next({
    ctx: {
      ...ctx,
      userId: user.id,
      root: user.root
    }
  })
})

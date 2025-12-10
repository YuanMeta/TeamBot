import { initTRPC, TRPCError } from '@trpc/server'
import z, { ZodError } from 'zod'
import superjson from 'superjson'
import { verifyUser } from '../session'
import * as trpcExpress from '@trpc/server/adapters/express'
import { publicAccess } from 'server/db/access'
import { db } from 'server/db'
import { and, eq, sql } from 'drizzle-orm'
import { accesses, accessRoles, userRoles } from 'server/db/drizzle/schema'

export const createContext = async ({
  req
}: trpcExpress.CreateExpressContextOptions) => {
  return {
    db: db,
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
    .filter((p) => !p.startsWith('chat.') && !p.startsWith('common.'))
  if (ctx.root || paths.every((p) => publicAccess.includes(p))) {
    return next({
      ctx: {
        ...ctx,
        userId: user.id
      }
    })
  }

  if (paths.length) {
    const uniquePaths = Array.from(new Set(paths))

    const userAccessList = await db
      .select({
        trpcAccess: accesses.trpcAccess
      })
      .from(userRoles)
      .innerJoin(accessRoles, eq(userRoles.roleId, accessRoles.roleId))
      .innerJoin(accesses, eq(accessRoles.accessId, accesses.id))
      .where(eq(userRoles.userId, user.id))
      .execute()

    const allTrpcAccess = new Set<string>()
    for (const access of userAccessList) {
      if (access.trpcAccess && Array.isArray(access.trpcAccess)) {
        access.trpcAccess.forEach((path) => allTrpcAccess.add(path))
      }
    }
    const hasAllPermissions = uniquePaths.every((path) =>
      allTrpcAccess.has(path)
    )

    if (!hasAllPermissions) {
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

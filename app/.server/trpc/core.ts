import { initTRPC, TRPCError } from '@trpc/server'
import z, { ZodError } from 'zod'
import superjson from 'superjson'
import { verifyUser } from '../session'
import * as trpcExpress from '@trpc/server/adapters/express'
import { publicAccess } from '../db/access'
import { db, type DbInstance } from '../db'
import { eq } from 'drizzle-orm'
import { accesses, accessRoles, userRoles } from '~/.server/drizzle/schema'

const t = initTRPC
  .context<{
    db: DbInstance
    userId: null | number
    req: Request
    root: boolean
  }>()
  .create({
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
  const user = await verifyUser(ctx.req.headers.get('cookie') || '')
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
  const user = await verifyUser(ctx.req.headers.get('cookie') || '')

  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  const url = new URL(ctx.req.url)

  const paths =
    url.pathname
      .match(/^\/trpc\/(.*)$/)?.[1]
      ?.split(',')
      .filter((p) => !p.startsWith('chat.') && !p.startsWith('common.')) || []
  if (user.root || paths.every((p) => publicAccess.includes(p))) {
    return next({
      ctx: {
        ...ctx,
        userId: user.id,
        root: user.root
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

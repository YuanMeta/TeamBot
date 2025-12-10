import { initTRPC, TRPCError } from '@trpc/server'
import z, { ZodError } from 'zod'
import superjson from 'superjson'
import { verifyUser } from '../session'
import * as trpcExpress from '@trpc/server/adapters/express'
import { publicAccess } from 'server/lib/db/access'
import { kdb } from 'server/lib/db/instance'
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
  const paths = ctx.req.path.slice(1).split(',')
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
    const [result] = await db
      .select({ count: sql<number>`COUNT(DISTINCT path)` })
      .from(userRoles)
      .innerJoin(accessRoles, eq(userRoles.roleId, accessRoles.roleId))
      .innerJoin(accesses, eq(accessRoles.accessId, accesses.id))
      // lateral JSONB -> setof text, 命名为 path
      .innerJoin(
        sql`LATERAL jsonb_array_elements_text(COALESCE(a.trpc_access, '[]'::jsonb)) as path`,
        // ON TRUE
        sql`TRUE`
      )
      .where(
        and(
          sql`ur.user_id = ${user.id}`,
          sql`path = ANY(${uniquePaths}::text[])`
        )
      )
    // 原生写法
    //       const result = await db.execute(sql`
    //   SELECT COUNT(DISTINCT path) as count
    //   FROM ${userRoles} as ur
    //   INNER JOIN ${accessRoles} as ar ON ur.role_id = ar.role_id
    //   INNER JOIN ${accesses} as a ON ar.access_id = a.id
    //   INNER JOIN LATERAL jsonb_array_elements_text(
    //     COALESCE(a.trpc_access, '[]'::jsonb)
    //   ) as path ON TRUE
    //   WHERE ur.user_id = ${user.id}
    //   AND path = ANY(${uniquePaths})
    // `)

    // const result = await ctx.db
    //   .selectFrom('user_roles as ur')
    //   .innerJoin('access_roles as ar', 'ur.role_id', 'ar.role_id')
    //   .innerJoin('accesses as a', 'ar.access_id', 'a.id')
    //   .innerJoin(
    //     sql`LATERAL jsonb_array_elements_text(
    //       COALESCE(a.trpc_access, '[]'::jsonb)
    //     )`.as('path'),
    //     (join) => join.onTrue()
    //   )
    //   .select(sql<string>`COUNT(DISTINCT path)`.as('count'))
    //   .where('ur.user_id', '=', user.id)
    //   .where(sql`path`, 'in', uniquePaths)
    //   .executeTakeFirst()

    const matchedCount = result ? Number(result.count) : 0

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

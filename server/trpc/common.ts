import { procedure } from './core'
import { isAdmin } from 'server/db/query'
import z from 'zod'
import { PasswordManager } from 'server/lib/password'
import { TRPCError } from '@trpc/server'
import ky from 'ky'
import { users, accesses, userRoles, accessRoles } from 'drizzle/schema'
import { eq } from 'drizzle-orm'

export const commonRouter = {
  getUserInfo: procedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      columns: {
        name: true,
        email: true,
        root: true
      },
      where: { id: ctx.userId }
    })
    if (!user) return null
    if (user.root) {
      return {
        name: user.name,
        email: user.email,
        root: true,
        admin: true
      }
    }

    return {
      name: user.name,
      email: user.email,
      root: false,
      admin: await isAdmin(ctx.db, ctx.userId)
    }
  }),
  getUserAccess: procedure.query(async ({ ctx }) => {
    if (ctx.root) {
      const accessData = await ctx.db.select({ id: accesses.id }).from(accesses)
      return accessData.map((access) => access.id)
    }
    const result = await ctx.db
      .selectDistinct({
        access: accesses.id
      })
      .from(userRoles)
      .innerJoin(accessRoles, eq(userRoles.roleId, accessRoles.roleId))
      .innerJoin(accesses, eq(accessRoles.accessId, accesses.id))
      .where(eq(userRoles.userId, ctx.userId))
    return result.map((row) => row.access)
  }),
  changePassword: procedure
    .input(
      z.object({
        oldPassword: z.string().min(6).max(30).optional(),
        password: z.string().min(6).max(30),
        repassowrd: z.string().min(6).max(30)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: {
          id: ctx.userId
        }
      })
      if (!user) return null
      if (
        user.password &&
        !(await PasswordManager.verifyPassword(
          input.oldPassword || '',
          user.password
        ))
      ) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '原密码不正确' })
      }
      await ctx.db
        .update(users)
        .set({
          password: await PasswordManager.hashPassword(input.password)
        })
        .where(eq(users.id, ctx.userId))
      return { success: true }
    }),
  httpTest: procedure
    .input(
      z.object({
        url: z.string().min(1),
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
        headers: z.record(z.string(), z.string()).optional(),
        params: z.record(z.string(), z.any()).optional(),
        timeout: z.number().optional().default(5000)
      })
    )
    .mutation(async ({ input }) => {
      try {
        const res = await ky(input.url, {
          timeout: input.timeout,
          method: input.method,
          headers: input.headers,
          json: ['GET', 'DELETE'].includes(input.method)
            ? undefined
            : input.params,
          searchParams: ['GET', 'DELETE'].includes(input.method)
            ? input.params
            : undefined
        })
        console.log('res', res.status)

        if (res.ok) {
          return res.text()
        } else {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: await res.text()
          })
        }
      } catch (e: any) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: e.message })
      }
    })
}

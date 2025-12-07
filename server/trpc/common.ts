import { procedure } from './core'
import { checkAllowUseAssistant, isAdmin } from 'server/lib/db/query'
import z from 'zod'
import { PasswordManager } from 'server/lib/password'
import { TRPCError } from '@trpc/server'

export const commonRouter = {
  getUserInfo: procedure.query(async ({ ctx }) => {
    const user = await ctx.db
      .selectFrom('users')
      .where('id', '=', ctx.userId)
      .select(['name', 'email', 'root'])
      .executeTakeFirst()
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
      const accesses = await ctx.db
        .selectFrom('accesses')
        .select(['id'])
        .execute()
      return accesses.map((access) => access.id)
    }

    const result = await ctx.db
      .selectFrom('user_roles as ur')
      .innerJoin('access_roles as ar', 'ur.role_id', 'ar.role_id')
      .innerJoin('accesses as a', 'ar.access_id', 'a.id')
      .where('ur.user_id', '=', ctx.userId)
      .select('a.id')
      .distinct()
      .execute()

    return result.map((row) => row.id)
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
      const user = await ctx.db
        .selectFrom('users')
        .where('id', '=', ctx.userId)
        .selectAll()
        .executeTakeFirst()
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
        .updateTable('users')
        .set({
          password: await PasswordManager.hashPassword(input.password)
        })
        .where('id', '=', ctx.userId)
        .execute()
      return { success: true }
    })
}

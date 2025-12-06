import type { Knex } from 'knex'
import { procedure } from './core'
import { isAdmin } from 'server/lib/db/query'

export const commonRouter = {
  getUserInfo: procedure.query(async ({ ctx }) => {
    const user = await ctx
      .db('users')
      .where({ id: ctx.userId })
      .select('name', 'email', 'root')
      .first()
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
      const accesses = await ctx.db('accesses').select('id')
      return accesses.map((access) => access.id)
    }

    const result = await ctx.db.raw(
      `
        SELECT DISTINCT a.id
        FROM user_roles ur
        JOIN access_roles ar ON ur.role_id = ar.role_id
        JOIN accesses a ON ar.access_id = a.id
        WHERE ur.user_id = ?
      `,
      [ctx.userId]
    )

    const rows =
      (result as unknown as { rows?: Array<{ id: string }> }).rows || []
    return rows.map((row) => row.id)
  })
}

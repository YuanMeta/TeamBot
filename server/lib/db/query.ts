import type { Knex } from 'knex'

export const isAdmin = async (db: Knex, userId: number) => {
  const result = await db.raw(
    `
        SELECT COUNT(*) as count
        FROM user_roles ur
        JOIN access_roles ar ON ur.role_id = ar.role_id
        JOIN accesses a ON ar.access_id = a.id
        WHERE ur.user_id = ? AND a.id = 'admin'
      `,
    [userId]
  )
  const rows =
    (result as unknown as { rows?: Array<{ count: string | number }> }).rows ||
    []
  return rows.length > 0 && Number(rows[0].count) > 0
}

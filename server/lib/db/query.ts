import type { KDB } from './instance'

export const isAdmin = async (db: KDB, userId: number) => {
  const result = await db
    .selectFrom('user_roles')
    .innerJoin('access_roles', 'user_roles.role_id', 'access_roles.role_id')
    .innerJoin('accesses', 'access_roles.access_id', 'accesses.id')
    .where('user_roles.user_id', '=', userId)
    .where('accesses.id', '=', 'admin')
    .select(({ fn }) => fn.countAll<number>().as('count'))
    .executeTakeFirst()

  return Number(result?.count ?? 0) > 0
}

export const checkAllowUseAssistant = async (
  db: KDB,
  userId: number,
  assistantId: number
) => {
  const result = await db
    .selectFrom('user_roles')
    .innerJoin('roles', 'user_roles.role_id', 'roles.id')
    .where((eb) =>
      eb.or([
        eb('roles.assistants', '@>', [assistantId]),
        eb('roles.all_assistants', '=', true)
      ])
    )
    .where('user_roles.user_id', '=', userId)
    .select('role_id')
    .executeTakeFirst()
  return result ? true : false
}

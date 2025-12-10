import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import {
  accesses,
  accessRoles,
  roles,
  userRoles
} from 'server/db/drizzle/schema'
import { and, arrayContains, count, eq, or } from 'drizzle-orm'
import type { DbInstance } from '.'

export const isAdmin = async (db: DbInstance, userId: number) => {
  const result = await db
    .select({
      roleId: userRoles.roleId
    })
    .from(userRoles)
    .innerJoin(accessRoles, eq(userRoles.roleId, accessRoles.roleId))
    .innerJoin(accesses, eq(accessRoles.accessId, accesses.id))
    .where(and(eq(userRoles.userId, userId), eq(accesses.id, 'admin')))
    .limit(1)
    .execute()

  return result.length > 0
}

export const checkAllowUseAssistant = async (
  db: NodePgDatabase,
  userId: number,
  assistantId: number
) => {
  const result = await db
    .select({
      roleId: userRoles.roleId
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        eq(userRoles.userId, userId),
        or(
          eq(roles.allAssistants, true),
          arrayContains(roles.assistants, [assistantId])
        )
      )
    )
    .limit(1)
  return result.length > 0
}

export const parseRecord = <T extends Record<string, any>>(
  data: T,
  boolFields?: string[]
): T => {
  return Object.keys(data).reduce((acc, key) => {
    let value = data[key]
    if (boolFields?.includes(key) && typeof value === 'number') {
      value = value === 1
    }
    if (
      typeof value === 'string' &&
      (value.startsWith('{') || value.startsWith('['))
    ) {
      try {
        acc[key] = JSON.parse(value)
      } catch (e) {
        acc[key] = value
      }
    } else {
      acc[key] = value
    }
    return acc
  }, {} as any)
}

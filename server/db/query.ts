import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import {
  accesses,
  accessRoles,
  assistantUsages,
  roleAssistants,
  roles,
  userRoles
} from 'server/db/drizzle/schema'
import { and, arrayContains, count, eq, or } from 'drizzle-orm'
import { increment, type DbInstance } from '.'
import type { Usage } from 'types'
import dayjs from 'dayjs'

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
    .leftJoin(roleAssistants, eq(roleAssistants.roleId, roles.id))
    .where(
      and(
        eq(userRoles.userId, userId),
        or(
          eq(roles.allAssistants, true),
          eq(roleAssistants.assistantId, assistantId)
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

export const addTokens = async (
  db: DbInstance,
  {
    usage,
    model,
    assistantId
  }: {
    assistantId: number
    model: string
    usage: Usage
  }
) => {
  const today = dayjs().startOf('day')
  const record = await db.query.assistantUsages.findFirst({
    columns: { id: true },
    where: {
      assistantId,
      model: model,
      createdAt: { eq: today.toDate() }
    }
  })
  if (record) {
    await db
      .update(assistantUsages)
      .set({
        inputTokens: increment(assistantUsages.inputTokens, usage.inputTokens),
        outputTokens: increment(
          assistantUsages.outputTokens,
          usage.outputTokens
        ),
        totalTokens: increment(assistantUsages.totalTokens, usage.totalTokens),
        reasoningTokens: increment(
          assistantUsages.reasoningTokens,
          usage.reasoningTokens
        ),
        cachedInputTokens: increment(
          assistantUsages.cachedInputTokens,
          usage.cachedInputTokens
        )
      })
      .where(eq(assistantUsages.id, record.id))
  } else {
    await db.insert(assistantUsages).values({
      assistantId: assistantId,
      model: model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      reasoningTokens: usage.reasoningTokens,
      cachedInputTokens: usage.cachedInputTokens,
      createdAt: today.toDate()
    })
  }
}

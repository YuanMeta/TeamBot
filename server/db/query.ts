import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import {
  accesses,
  accessRoles,
  assistantUsages,
  requests,
  roleAssistants,
  roles,
  userRoles
} from 'drizzle/schema'
import { and, eq, gte, or } from 'drizzle-orm'
import { increment, type DbInstance } from '.'
import type { Usage } from 'types'
import dayjs from 'dayjs'
import { TRPCError } from '@trpc/server'
import type { LimitData } from './type'
import { cacheable } from 'server/lib/cache'

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
  {
    userId,
    assistantId
  }: {
    userId: number
    assistantId: number
  }
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

export const recordRequest = async (
  db: DbInstance,
  {
    usage,
    model,
    assistantId,
    body,
    messageId,
    chatId,
    task
  }: {
    assistantId: number
    model: string
    usage: Usage
    body: any
    messageId?: string
    chatId?: string
    task: 'chat' | 'title' | 'compress' | 'query_plan'
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
  await db
    .insert(requests)
    .values({
      assistantId: assistantId,
      task: task,
      totalTokens: usage.totalTokens,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      chatId,
      messageId,
      model,
      detail: JSON.stringify(body || null)
    })
    .catch((e) => {
      console.error(e)
    })
}

export const testAssistantAuth = async (
  db: DbInstance,
  options: {
    userId: number
    assistantId: number
    model: string
  }
) => {
  const cache = await cacheable.get(
    `auth:${options.userId}:${options.assistantId}:${options.model}`
  )
  if (cache) {
    return true
  }
  const allow = await checkAllowUseAssistant(db, {
    userId: options.userId,
    assistantId: options.assistantId
  })
  if (!allow) {
    throw new TRPCError({
      code: 'FORBIDDEN'
    })
  }
  const assistant = await db.query.assistants.findFirst({
    where: { id: options.assistantId },
    columns: {
      models: true
    },
    with: {
      limits: {
        where: { type: 'chat' }
      }
    }
  })
  if (!assistant || !assistant.models.includes(options.model)) {
    throw new TRPCError({
      code: 'NOT_FOUND'
    })
  }
  if (assistant.limits.length > 0) {
    for (let limit of assistant.limits) {
      if (limit.num > 0) {
        let date = dayjs()
        if (limit.time === 'day') {
          date = date.startOf('day')
        } else if (limit.time === 'week') {
          date = date.startOf('week')
        } else if (limit.time === 'month') {
          date = date.startOf('month')
        }
        const count = await db.$count(
          requests,
          and(
            eq(requests.assistantId, options.assistantId),
            eq(requests.task, 'chat'),
            gte(requests.createdAt, date.toDate())
          )
        )
        if (count >= limit.num) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: JSON.stringify({ num: limit.num, time: limit.time })
          })
        }
      }
    }
  }
  await cacheable.set(
    `auth:${options.userId}:${options.assistantId}:${options.model}`,
    true,
    8000
  )
  return true
}

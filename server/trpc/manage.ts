import { TRPCError, type TRPCRouterRecord } from '@trpc/server'
import z from 'zod'
import { checkLLmConnect } from '../lib/checkConnect'
import { PasswordManager } from '../lib/password'
import { adminProcedure } from './core'
import { runWebSearch } from 'server/lib/search'
import dayjs from 'dayjs'
import { deleteUserCache } from 'server/session'
import { systemTools } from 'server/lib/tools'
import { aesDecrypt, aesEncrypt } from 'server/lib/utils'
import {
  eq,
  and,
  or,
  like,
  inArray,
  sql,
  desc,
  count,
  sum,
  gte
} from 'drizzle-orm'
import {
  assistants,
  assistantTools,
  users,
  userRoles,
  roles,
  tools,
  models,
  authProviders,
  oauthAccounts,
  assistantUsages,
  accesses,
  accessRoles
} from 'server/db/drizzle/schema'
export const manageRouter = {
  checkConnect: adminProcedure
    .input(
      z.object({
        mode: z.string().min(1),
        api_key: z.string().nullable(),
        base_url: z.string().nullable(),
        models: z.array(z.string()).min(1)
      })
    )
    .mutation(async ({ input }) => {
      return checkLLmConnect(input)
    }),
  getAssistants: adminProcedure
    .input(
      z.object({
        page: z.number(),
        pageSize: z.number()
      })
    )
    .query(async ({ ctx, input }) => {
      const list = await ctx.db.query.assistants.findMany({
        columns: {
          id: true,
          name: true,
          mode: true,
          models: true,
          apiKey: true,
          baseUrl: true,
          options: true,
          createdAt: true,
          prompt: true
        },
        orderBy: {
          id: 'desc'
        },
        offset: (input.page - 1) * input.pageSize,
        limit: input.pageSize
      })
      const total = await ctx.db.$count(assistants)
      return {
        list,
        total
      }
    }),
  getAssistant: adminProcedure
    .input(z.number())
    .query(async ({ input, ctx }) => {
      const [record] = await ctx.db
        .select()
        .from(assistants)
        .where(eq(assistants.id, input))
      if (!record) return null
      const toolsList = await ctx.db
        .select({
          toolId: assistantTools.toolId,
          systemToolId: assistantTools.systemToolId
        })
        .from(assistantTools)
        .where(eq(assistantTools.assistantId, input))
      return {
        ...record,
        apiKey: record.apiKey ? await aesDecrypt(record.apiKey) : null,
        tools: toolsList.map((t) => t.toolId || t.systemToolId)
      }
    }),
  updateAssistant: adminProcedure
    .input(
      z.object({
        id: z.number(),
        tools: z.string().array(),
        data: z.object({
          name: z.string().min(1),
          mode: z.string().min(1),
          models: z.array(z.string()).min(1),
          api_key: z.string().nullable(),
          base_url: z.string().nullable(),
          options: z.record(z.string(), z.any())
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db.transaction(async (trx) => {
        await trx
          .update(assistants)
          .set({
            name: input.data.name,
            mode: input.data.mode,
            models: input.data.models as any,
            apiKey: input.data.api_key
              ? await aesEncrypt(input.data.api_key)
              : null,
            baseUrl: input.data.base_url,
            options: input.data.options as any
          })
          .where(eq(assistants.id, input.id))
        await trx
          .delete(assistantTools)
          .where(eq(assistantTools.assistantId, input.id))
        if (input.tools.length > 0) {
          if (input.tools.length) {
            await trx.insert(assistantTools).values(
              input.tools.map((tool) => {
                if (systemTools.includes(tool)) {
                  return {
                    assistantId: input.id,
                    systemToolId: tool,
                    toolId: null
                  }
                } else {
                  return {
                    assistantId: input.id,
                    toolId: tool,
                    systemToolId: null
                  }
                }
              })
            )
          }
        }
      })
      return { success: true }
    }),
  deleteAssistant: adminProcedure
    .input(
      z.object({
        assistantId: z.number()
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db.transaction(async (trx) => {
        await trx
          .delete(assistantTools)
          .where(eq(assistantTools.assistantId, input.assistantId))
        await trx.delete(assistants).where(eq(assistants.id, input.assistantId))
      })
      return { success: true }
    }),
  createAssistant: adminProcedure
    .input(
      z.object({
        tools: z.string().array(),
        data: z.object({
          name: z.string().min(1),
          mode: z.string().min(1),
          models: z.array(z.string()).min(1),
          api_key: z.string().nullable(),
          base_url: z.string().nullable(),
          options: z.record(z.string(), z.any())
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db.transaction(async (trx) => {
        const [assistant] = await trx
          .insert(assistants)
          .values({
            name: input.data.name,
            mode: input.data.mode,
            models: input.data.models as any,
            apiKey: input.data.api_key
              ? await aesEncrypt(input.data.api_key)
              : null,
            baseUrl: input.data.base_url,
            options: input.data.options as any
          })
          .returning({ id: assistants.id })
        if (input.tools.length) {
          await trx.insert(assistantTools).values(
            input.tools.map((tool) => {
              if (systemTools.includes(tool)) {
                return {
                  assistantId: assistant.id,
                  systemToolId: tool,
                  toolId: null
                }
              } else {
                return {
                  assistantId: assistant.id,
                  toolId: tool,
                  systemToolId: null
                }
              }
            })
          )
        }
      })
      return { success: true }
    }),
  createMember: adminProcedure
    .input(
      z.object({
        email: z.email().optional(),
        password: z.string().min(6).max(30),
        name: z.string().min(1),
        roles: z.number().array()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.transaction(async (trx) => {
        const [user] = await trx
          .insert(users)
          .values({
            email: input.email,
            password: await PasswordManager.hashPassword(input.password),
            name: input.name
          })
          .returning({ id: users.id })
        if (input.roles.length) {
          await trx.insert(userRoles).values(
            input.roles.map((role) => ({
              userId: user.id,
              roleId: role
            }))
          )
        }
        return user.id
      })
    }),
  updateMember: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        email: z.email().optional(),
        password: z.string().min(8).max(50).optional(),
        name: z.string().min(1).optional(),
        roles: z.number().array()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.transaction(async (trx) => {
        await trx
          .update(users)
          .set({
            email: input.email,
            password: input.password
              ? await PasswordManager.hashPassword(input.password)
              : undefined,
            name: input.name
          })
          .where(eq(users.id, input.userId))
        await trx.delete(userRoles).where(eq(userRoles.userId, input.userId))
        if (input.roles.length) {
          await trx.insert(userRoles).values(
            input.roles.map((role) => ({
              userId: input.userId,
              roleId: role
            }))
          )
        }
        return input.userId
      })
    }),
  getMember: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const member = await ctx.db.query.users.findFirst({
        columns: {
          id: true,
          email: true,
          avatar: true,
          name: true,
          root: true,
          createdAt: true,
          deleted: true
        },
        with: {
          roles: {
            columns: {
              id: true
            }
          }
        },
        where: {
          id: input.id
        }
      })
      return member
    }),
  getMembers: adminProcedure
    .input(
      z.object({
        page: z.number(),
        pageSize: z.number(),
        keyword: z.string().optional()
      })
    )
    .query(async ({ input, ctx }) => {
      const where = input.keyword
        ? {
            AND: [
              { deleted: false },
              {
                OR: [
                  { name: { like: `%${input.keyword}%` } },
                  { email: { like: `%${input.keyword}%` } }
                ]
              }
            ]
          }
        : { deleted: false }
      const members = await ctx.db.query.users.findMany({
        columns: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          root: true,
          createdAt: true
        },
        orderBy: {
          id: 'desc'
        },
        offset: (input.page - 1) * input.pageSize,
        limit: input.pageSize,
        with: {
          roles: {
            columns: {
              id: true,
              name: true
            }
          }
        },
        where
      })

      const total = await ctx.db.$count(
        users,
        input.keyword
          ? and(
              eq(users.deleted, false),
              or(
                like(users.name, `%${input.keyword}%`),
                like(users.email, `%${input.keyword}%`)
              )
            )
          : eq(users.deleted, false)
      )

      return { members, total }
    }),
  deleteMember: adminProcedure
    .input(
      z.object({
        memberId: z.number()
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.userId === input.memberId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '不可删除自己的账号'
        })
      }
      await ctx.db
        .update(users)
        .set({ deleted: true })
        .where(eq(users.id, input.memberId))
      await deleteUserCache(input.memberId)
      return { success: true }
    }),
  createTool: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        id: z.string().min(1),
        description: z.string().min(1),
        params: z.record(z.string(), z.any())
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [existingTool] = await ctx.db
        .select()
        .from(tools)
        .where(eq(tools.id, input.id))
      const exist = systemTools.includes(input.id) || !!existingTool
      if (exist) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '工具ID已存在'
        })
      }
      await ctx.db.insert(tools).values({
        id: input.id,
        name: input.name,
        type: 'http',
        description: input.description,
        params: input.params as any
      })
      return { success: true }
    }),
  updateTool: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        data: z.object({
          name: z.string().min(1).optional(),
          description: z.string().min(1).optional(),
          params: z.record(z.string(), z.any()).optional()
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(tools)
        .set({
          ...input.data,
          params: input.data.params ? input.data.params : undefined
        })
        .where(eq(tools.id, input.id))
      return { success: true }
    }),
  getTools: adminProcedure
    .input(
      z.object({
        page: z.number(),
        pageSize: z.number()
      })
    )
    .query(async ({ input, ctx }) => {
      const toolsData = await ctx.db.query.tools.findMany({
        columns: {
          id: true,
          name: true,
          auto: true,
          type: true,
          createdAt: true,
          description: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        offset: (input.page - 1) * input.pageSize,
        limit: input.pageSize
      })
      const total = await ctx.db.$count(tools)
      return { tools: toolsData, total }
    }),
  getTool: adminProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const tool = await ctx.db.query.tools.findFirst({
      where: { id: input }
    })
    return tool ?? null
  }),
  deleteTool: adminProcedure
    .input(
      z.object({
        toolId: z.string().min(1)
      })
    )
    .mutation(async ({ input, ctx }) => {
      const deps = await ctx.db.query.assistantTools.findFirst({
        where: { toolId: input.toolId }
      })
      if (deps) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '工具已被助手使用，无法删除'
        })
      }
      await ctx.db.delete(tools).where(eq(tools.id, input.toolId))
      return { success: true }
    }),
  connectSearch: adminProcedure
    .input(
      z.object({
        mode: z.enum(['tavily', 'exa', 'google', 'bocha', 'zhipu']),
        apiKey: z.string(),
        cseId: z.string().optional()
      })
    )
    .mutation(async ({ input }) => {
      return runWebSearch('Latest news about iPhone', input)
    }),
  getModels: adminProcedure
    .input(
      z.object({
        provider: z.string().optional()
      })
    )
    .query(async ({ input, ctx }) => {
      const whereCondition = input.provider
        ? eq(models.provider, input.provider)
        : undefined
      return ctx.db
        .select({
          id: models.id,
          model: models.model,
          provider: models.provider
        })
        .from(models)
        .where(whereCondition)
    }),
  getAuthProviders: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.authProviders.findMany({
      columns: {
        id: true,
        name: true,
        scopes: true,
        createdAt: true,
        usePkce: true,
        updatedAt: true,
        description: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }),
  createAuthProvider: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        issuer: z.string().optional(),
        auth_url: z.string().min(1),
        token_url: z.string().min(1),
        userinfo_url: z.string().optional(),
        jwks_uri: z.string().optional(),
        client_id: z.string().min(1),
        client_secret: z.string().optional(),
        scopes: z.string().optional(),
        use_pkce: z.boolean().optional(),
        description: z.string().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db.insert(authProviders).values({
        name: input.name,
        issuer: input.issuer,
        authUrl: input.auth_url,
        tokenUrl: input.token_url,
        userinfoUrl: input.userinfo_url,
        jwksUri: input.jwks_uri,
        clientId: input.client_id,
        clientSecret: input.client_secret,
        scopes: input.scopes,
        usePkce: input.use_pkce,
        description: input.description
      })
      return { success: true }
    }),
  updateAuthProvider: adminProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().min(1).optional(),
          issuer: z.string().optional(),
          auth_url: z.string().min(1),
          token_url: z.string().min(1),
          userinfo_url: z.string().optional(),
          jwks_uri: z.string().optional(),
          client_id: z.string().min(1),
          client_secret: z.string().optional(),
          scopes: z.string().optional(),
          use_pkce: z.boolean().optional(),
          description: z.string().optional()
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(authProviders)
        .set(input.data)
        .where(eq(authProviders.id, input.id))
      return { success: true }
    }),
  deleteAuthProvider: adminProcedure
    .input(
      z.object({
        providerId: z.number()
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db.transaction(async (trx) => {
        await trx
          .delete(oauthAccounts)
          .where(eq(oauthAccounts.providerId, input.providerId))
        await trx
          .delete(authProviders)
          .where(eq(authProviders.id, input.providerId))
      })
      return { success: true }
    }),
  getAuthProvider: adminProcedure
    .input(z.number())
    .query(async ({ input, ctx }) => {
      return ctx.db.query.authProviders.findFirst({
        where: { id: input }
      })
    }),
  getUsageInfo: adminProcedure
    .input(
      z.object({
        date: z.string()
      })
    )
    .query(async ({ input, ctx }) => {
      let date = dayjs().startOf('day')
      let dateStr = date.format('YYYY-MM-DD')
      switch (input.date) {
        case 'last3Days':
          date = date.subtract(3, 'day')
          break
        case 'lastWeek':
          date = date.subtract(7, 'day')
          break
        case 'lastMonth':
          date = date.subtract(30, 'day')
          break
        case 'last3Months':
          date = date.subtract(90, 'day')
          break
      }

      const assistantsList = await ctx.db.query.assistants.findMany({
        columns: {
          id: true,
          name: true,
          mode: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      const usage = await ctx.db
        .select({
          assistant_id: assistantUsages.assistantId,
          input_tokens: sum(assistantUsages.inputTokens),
          output_tokens: sum(assistantUsages.outputTokens),
          total_tokens: sum(assistantUsages.totalTokens),
          reasoning_tokens: sum(assistantUsages.reasoningTokens),
          cached_input_tokens: sum(assistantUsages.cachedInputTokens)
        })
        .from(assistantUsages)
        .where(gte(assistantUsages.createdAt, date.toDate()))
        .groupBy(assistantUsages.assistantId)

      const usageMap = new Map(
        usage.map((r) => [
          r.assistant_id,
          {
            input_tokens: Number(r.input_tokens) || 0,
            output_tokens: Number(r.output_tokens) || 0,
            total_tokens: Number(r.total_tokens) || 0,
            reasoning_tokens: Number(r.reasoning_tokens) || 0,
            cached_input_tokens: Number(r.cached_input_tokens) || 0
          }
        ])
      )

      // 合并助手信息和使用统计
      const result = assistantsList.map((assistant) => {
        const usageData = usageMap.get(assistant.id) || {
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
          reasoning_tokens: 0,
          cached_input_tokens: 0
        }

        return {
          assistantId: assistant.id,
          assistantName: assistant.name,
          assistantMode: assistant.mode,
          inputTokens: usageData.input_tokens,
          outputTokens: usageData.output_tokens,
          totalTokens: usageData.total_tokens,
          reasoningTokens: usageData.reasoning_tokens,
          cachedInputTokens: usageData.cached_input_tokens
        }
      })

      result.sort((a, b) => b.totalTokens - a.totalTokens)

      return result
    }),
  getSystemTools: adminProcedure.query(() => {
    return systemTools
  }),
  getRoles: adminProcedure
    .input(
      z.object({
        page: z.number(),
        pageSize: z.number()
      })
    )
    .query(async ({ ctx, input }) => {
      const list = await ctx.db
        .select({
          id: roles.id,
          name: roles.name,
          remark: roles.remark
        })
        .from(roles)
        .offset((input.page - 1) * input.pageSize)
        .limit(input.pageSize)
        .orderBy(desc(roles.id))
      const [totalResult] = await ctx.db
        .select({ total: count(roles.id) })
        .from(roles)
      return {
        list,
        total: +(totalResult?.total || 0)
      }
    }),
  getRole: adminProcedure.input(z.number()).query(async ({ input, ctx }) => {
    const role = await ctx.db.query.roles.findFirst({
      where: { id: input },
      with: {
        accesses: {
          columns: { id: true }
        }
      }
    })
    return role
  }),
  deleteRole: adminProcedure
    .input(z.number())
    .mutation(async ({ input, ctx }) => {
      const [user] = await ctx.db
        .select()
        .from(userRoles)
        .where(eq(userRoles.roleId, input))
      if (user) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '角色已被用户使用，无法删除'
        })
      }
      await ctx.db.transaction(async (trx) => {
        await trx.delete(accessRoles).where(eq(accessRoles.roleId, input))
        await trx.delete(roles).where(eq(roles.id, input))
      })
      return { success: true }
    }),
  createRole: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        remark: z.string().optional(),
        access: z.array(z.string()),
        assistants: z.array(z.number()),
        allAssistants: z.boolean()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.transaction(async (trx) => {
        const [role] = await trx
          .insert(roles)
          .values({
            name: input.name,
            remark: input.remark,
            assistants: input.assistants as any,
            allAssistants: input.allAssistants
          })
          .returning({ id: roles.id })
        if (input.access.length) {
          await trx.insert(accessRoles).values(
            input.access.map((access) => ({
              roleId: role.id,
              accessId: access
            }))
          )
        }
        return role
      })
    }),
  updateRole: adminProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().min(1).optional(),
          remark: z.string().optional(),
          access: z.array(z.string()),
          assistants: z.array(z.number()),
          allAssistants: z.boolean()
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.transaction(async (trx) => {
        await trx
          .update(roles)
          .set({
            name: input.data.name,
            remark: input.data.remark,
            assistants: input.data.assistants,
            allAssistants: input.data.allAssistants
          })
          .where(eq(roles.id, input.id))
        await trx.delete(accessRoles).where(eq(accessRoles.roleId, input.id))
        if (input.data.access.length) {
          await trx.insert(accessRoles).values(
            input.data.access.map((access) => ({
              roleId: input.id,
              accessId: access
            }))
          )
        }
        return input.id
      })
    }),
  getAccesses: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.select({ id: accesses.id }).from(accesses)
  }),
  getAssistantOptions: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({ id: assistants.id, name: assistants.name })
      .from(assistants)
  }),
  getRoleMembers: adminProcedure
    .input(
      z.object({
        roleId: z.number(),
        page: z.number(),
        pageSize: z.number()
      })
    )
    .query(async ({ input, ctx }) => {
      const list = await ctx.db.query.roles.findFirst({
        columns: {},
        where: {
          id: input.roleId
        },
        with: {
          users: {
            columns: { id: true, email: true, name: true },
            orderBy: {
              id: 'desc'
            },
            offset: (input.page - 1) * input.pageSize,
            limit: input.pageSize
          }
        }
      })
      const [totalResult] = await ctx.db
        .select({ total: count(userRoles.userId) })
        .from(userRoles)
        .where(eq(userRoles.roleId, input.roleId))
      return {
        list: list?.users || [],
        total: totalResult?.total || 0
      }
    }),
  remoteRoleFromUser: adminProcedure
    .input(
      z.object({
        roleId: z.number(),
        userId: z.number()
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(userRoles)
        .where(
          and(
            eq(userRoles.userId, input.userId),
            eq(userRoles.roleId, input.roleId)
          )
        )
      return { success: true }
    }),
  searchMembers: adminProcedure
    .input(
      z.object({
        keyword: z.string().optional()
      })
    )
    .query(async ({ input, ctx }) => {
      return ctx.db.query.users.findMany({
        columns: { id: true, name: true, email: true },
        where: {
          OR: [
            { name: { like: `%${input.keyword}%` } },
            { email: { like: `%${input.keyword}%` } }
          ]
        },
        orderBy: {
          id: 'desc'
        }
      })
    }),
  addRoleToUser: adminProcedure
    .input(
      z.object({
        roleId: z.number(),
        userId: z.number()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [record] = await ctx.db
        .select()
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, input.userId),
            eq(userRoles.roleId, input.roleId)
          )
        )
      if (record) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '用户已拥有该角色'
        })
      }
      await ctx.db
        .insert(userRoles)
        .values({ userId: input.userId, roleId: input.roleId })
      return { success: true }
    })
} satisfies TRPCRouterRecord

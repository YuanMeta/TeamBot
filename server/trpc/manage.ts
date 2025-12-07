import { TRPCError, type TRPCRouterRecord } from '@trpc/server'
import z from 'zod'
import { checkLLmConnect } from '../lib/checkConnect'
import { PasswordManager } from '../lib/password'
import { parseRecord } from 'server/lib/db/table'
import { adminProcedure } from './core'
import { runWebSearch } from 'server/lib/search'
import dayjs from 'dayjs'
import { deleteUserCache } from 'server/session'
import { systemTools } from 'server/lib/tools'
import { aesDecrypt, aesEncrypt } from 'server/lib/utils'
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
      const list = await ctx.db
        .selectFrom('assistants')
        .offset((input.page - 1) * input.pageSize)
        .limit(input.pageSize)
        .select([
          'id',
          'name',
          'mode',
          'models',
          'api_key',
          'base_url',
          'options',
          'created_at',
          'prompt'
        ])
        .orderBy('id', 'desc')
        .execute()
      const total = await ctx.db
        .selectFrom('assistants')
        .select((eb) => eb.fn.count<string>('id').as('total'))
        .executeTakeFirst()
      return {
        list,
        total: +(total?.total || 0)
      }
    }),
  getAssistant: adminProcedure
    .input(z.number())
    .query(async ({ input, ctx }) => {
      const record = await ctx.db
        .selectFrom('assistants')
        .where('id', '=', input)
        .selectAll()
        .executeTakeFirst()
      if (!record) return null
      const tools = await ctx.db
        .selectFrom('assistant_tools')
        .where('assistant_id', '=', input)
        .select(['tool_id', 'system_tool_id'])
        .execute()
      return {
        ...record,
        api_key: record.api_key ? await aesDecrypt(record.api_key) : null,
        tools: tools.map((t) => t.tool_id || t.system_tool_id)
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
      await ctx.db.transaction().execute(async (trx) => {
        await trx
          .updateTable('assistants')
          .set({
            name: input.data.name,
            mode: input.data.mode,
            models: JSON.stringify(input.data.models),
            api_key: input.data.api_key
              ? await aesEncrypt(input.data.api_key)
              : null,
            base_url: input.data.base_url,
            options: input.data.options as any
          })
          .where('id', '=', input.id)
          .execute()
        await trx
          .deleteFrom('assistant_tools')
          .where('assistant_id', '=', input.id)
          .execute()
        if (input.tools.length > 0) {
          if (input.tools.length) {
            await trx
              .insertInto('assistant_tools')
              .values(
                input.tools.map((tool) => {
                  if (systemTools.includes(tool)) {
                    return {
                      assistant_id: input.id,
                      system_tool_id: tool
                    }
                  } else {
                    return {
                      assistant_id: input.id,
                      tool_id: tool
                    }
                  }
                })
              )
              .execute()
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
      await ctx.db.transaction().execute(async (trx) => {
        await trx
          .deleteFrom('assistant_tools')
          .where('assistant_id', '=', input.assistantId)
          .execute()
        await trx
          .deleteFrom('assistants')
          .where('id', '=', input.assistantId)
          .execute()
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
      await ctx.db.transaction().execute(async (trx) => {
        const assistant = await trx
          .insertInto('assistants')
          .values({
            name: input.data.name,
            mode: input.data.mode,
            models: JSON.stringify(input.data.models),
            api_key: input.data.api_key
              ? await aesEncrypt(input.data.api_key)
              : null,
            base_url: input.data.base_url,
            options: input.data.options as any
          })
          .returning(['id'])
          .executeTakeFirstOrThrow()
        if (input.tools.length) {
          await trx
            .insertInto('assistant_tools')
            .values(
              input.tools.map((tool) => {
                if (systemTools.includes(tool)) {
                  return {
                    assistant_id: assistant.id,
                    system_tool_id: tool
                  }
                } else {
                  return {
                    assistant_id: assistant.id,
                    tool_id: tool
                  }
                }
              })
            )
            .execute()
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
      return ctx.db.transaction().execute(async (trx) => {
        const user = await trx
          .insertInto('users')
          .values({
            email: input.email,
            password: await PasswordManager.hashPassword(input.password),
            name: input.name
          })
          .returning(['id'])
          .executeTakeFirstOrThrow()
        if (input.roles.length) {
          await trx
            .insertInto('user_roles')
            .values(
              input.roles.map((role) => ({
                user_id: user.id,
                role_id: role
              }))
            )
            .execute()
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
      return ctx.db.transaction().execute(async (trx) => {
        await trx
          .updateTable('users')
          .set({
            email: input.email,
            password: input.password
              ? await PasswordManager.hashPassword(input.password)
              : undefined,
            name: input.name
          })
          .where('id', '=', input.userId)
          .execute()
        await trx
          .deleteFrom('user_roles')
          .where('user_id', '=', input.userId)
          .execute()
        if (input.roles.length) {
          await trx
            .insertInto('user_roles')
            .values(
              input.roles.map((role) => ({
                user_id: input.userId,
                role_id: role
              }))
            )
            .execute()
        }
        return input.userId
      })
    }),
  getMember: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const member = await ctx.db
        .selectFrom('users')
        .where('id', '=', input.id)
        .select([
          'id',
          'email',
          'avatar',
          'name',
          'root',
          'created_at',
          'deleted'
        ])
        .executeTakeFirst()
      const roles = await ctx.db
        .selectFrom('user_roles')
        .where('user_id', '=', input.id)
        .select(['role_id'])
        .execute()
      return {
        ...member,
        roles: roles.map((r) => r.role_id)
      }
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
      let membersQuery = ctx.db.selectFrom('users')

      if (input.keyword) {
        membersQuery = membersQuery.where((eb) =>
          eb.or([
            eb('name', 'like', `%${input.keyword}%`),
            eb('email', 'like', `%${input.keyword}%`)
          ])
        )
      }

      const members = await membersQuery
        .select(['id', 'email', 'name', 'avatar', 'root'])
        .orderBy('created_at', 'desc')
        .offset((input.page - 1) * input.pageSize)
        .limit(input.pageSize)
        .execute()

      let totalQuery = ctx.db.selectFrom('users')
      if (input.keyword) {
        totalQuery = totalQuery.where((eb) =>
          eb.or([
            eb('name', 'like', `%${input.keyword}%`),
            eb('email', 'like', `%${input.keyword}%`)
          ])
        )
      }
      const total = await totalQuery
        .select((eb) => eb.fn.count<string>('id').as('total'))
        .executeTakeFirst()

      const memberIds = members.map((m) => m.id)
      const userRoles =
        memberIds.length > 0
          ? await ctx.db
              .selectFrom('user_roles')
              .innerJoin('roles', 'user_roles.role_id', 'roles.id')
              .where('user_roles.user_id', 'in', memberIds)
              .select([
                'user_roles.user_id as user_id',
                'roles.name as role_name'
              ])
              .execute()
          : []

      const rolesByUser = userRoles.reduce((acc, { user_id, role_name }) => {
        if (!acc[user_id]) {
          acc[user_id] = []
        }
        acc[user_id].push(role_name)
        return acc
      }, {} as Record<number, string[]>)

      const membersWithRoles = members.map((member) => ({
        ...member,
        roles: rolesByUser[member.id] || []
      }))

      return { members: membersWithRoles, total: +(total?.total || 0) }
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
        .updateTable('users')
        .set({ deleted: true })
        .where('id', '=', input.memberId)
        .execute()
      await deleteUserCache(input.memberId)
      return { success: true }
    }),
  createTool: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        id: z.string().min(1),
        description: z.string().min(1),
        type: z.enum(['web_search', 'http']),
        auto: z.boolean(),
        params: z.record(z.string(), z.any())
      })
    )
    .mutation(async ({ input, ctx }) => {
      const exist =
        systemTools.includes(input.id) ||
        !!(await ctx.db
          .selectFrom('tools')
          .where('id', '=', input.id)
          .selectAll()
          .executeTakeFirst())
      if (exist) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '工具ID已存在'
        })
      }
      await ctx.db
        .insertInto('tools')
        .values({
          id: input.id,
          name: input.name,
          description: input.description,
          type: input.type,
          auto: input.auto,
          params: input.params as any
        })
        .execute()
      return { success: true }
    }),
  updateTool: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        data: z.object({
          name: z.string().min(1).optional(),
          description: z.string().min(1).optional(),
          auto: z.boolean().optional(),
          type: z.enum(['web_search', 'http']).optional(),
          params: z.record(z.string(), z.any()).optional()
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .updateTable('tools')
        .set({
          ...input.data,
          params: input.data.params
            ? JSON.stringify(input.data.params)
            : undefined
        })
        .where('id', '=', input.id)
        .execute()
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
      const tools = await ctx.db
        .selectFrom('tools')
        .offset((input.page - 1) * input.pageSize)
        .limit(input.pageSize)
        .selectAll()
        .orderBy('created_at', 'desc')
        .execute()
      const total = await ctx.db
        .selectFrom('tools')
        .select((eb) => eb.fn.count<string>('id').as('total'))
        .executeTakeFirst()
      return { tools, total: +(total?.total || 0) }
    }),
  getTool: adminProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const record = await ctx.db
      .selectFrom('tools')
      .where('id', '=', input)
      .selectAll()
      .executeTakeFirst()
    return record ? parseRecord(record, ['auto']) : null
  }),
  deleteTool: adminProcedure
    .input(
      z.object({
        toolId: z.string().min(1)
      })
    )
    .mutation(async ({ input, ctx }) => {
      const deps = await ctx.db
        .selectFrom('assistant_tools')
        .where('tool_id', '=', input.toolId)
        .selectAll()
        .executeTakeFirst()
      if (deps) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '工具已被助手使用，无法删除'
        })
      }
      await ctx.db.deleteFrom('tools').where('id', '=', input.toolId).execute()
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
      let query = ctx.db.selectFrom('models')
      if (input.provider) {
        query = query.where('provider', '=', input.provider)
      }
      return query.select(['id', 'model', 'provider']).execute()
    }),
  getAuthProviders: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .selectFrom('auth_providers')
      .select(['id', 'name', 'scopes', 'created_at', 'use_pkce', 'updated_at'])
      .execute()
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
        allow_jit_provision: z.boolean().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .insertInto('auth_providers')
        .values({
          name: input.name,
          issuer: input.issuer,
          auth_url: input.auth_url,
          token_url: input.token_url,
          userinfo_url: input.userinfo_url,
          jwks_uri: input.jwks_uri,
          client_id: input.client_id,
          client_secret: input.client_secret,
          scopes: input.scopes,
          use_pkce: input.use_pkce
        })
        .execute()
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
          allow_jit_provision: z.boolean().optional()
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .updateTable('auth_providers')
        .set(input.data)
        .where('id', '=', input.id)
        .execute()
      return { success: true }
    }),
  deleteAuthProvider: adminProcedure
    .input(
      z.object({
        providerId: z.number()
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db.transaction().execute(async (trx) => {
        await trx
          .deleteFrom('oauth_accounts')
          .where('provider_id', '=', input.providerId)
          .execute()
        await trx
          .deleteFrom('auth_providers')
          .where('id', '=', input.providerId)
          .execute()
      })
      return { success: true }
    }),
  getAuthProvider: adminProcedure
    .input(z.number())
    .query(async ({ input, ctx }) => {
      return ctx.db
        .selectFrom('auth_providers')
        .where('id', '=', input)
        .selectAll()
        .executeTakeFirst()
    }),
  getUsageInfo: adminProcedure
    .input(
      z.object({
        date: z.string()
      })
    )
    .query(async ({ input, ctx }) => {
      const date = dayjs().startOf('day')
      let dateStr = date.format('YYYY-MM-DD')
      switch (input.date) {
        case 'last3Days':
          dateStr = date.subtract(3, 'day').format('YYYY-MM-DD')
          break
        case 'lastWeek':
          dateStr = date.subtract(7, 'day').format('YYYY-MM-DD')
          break
        case 'lastMonth':
          dateStr = date.subtract(30, 'day').format('YYYY-MM-DD')
          break
        case 'last3Months':
          dateStr = date.subtract(90, 'day').format('YYYY-MM-DD')
          break
      }

      const assistants = await ctx.db
        .selectFrom('assistants')
        .select(['id', 'name', 'mode'])
        .orderBy('created_at', 'desc')
        .execute()

      const usage = await ctx.db
        .selectFrom('assistant_usages')
        .where('assistant_usages.created_at', '>=', new Date(dateStr))
        .select([
          'assistant_usages.assistant_id',
          (eb) =>
            eb.fn
              .sum<string>('assistant_usages.input_tokens')
              .as('input_tokens'),
          (eb) =>
            eb.fn
              .sum<string>('assistant_usages.output_tokens')
              .as('output_tokens'),
          (eb) =>
            eb.fn
              .sum<string>('assistant_usages.total_tokens')
              .as('total_tokens'),
          (eb) =>
            eb.fn
              .sum<string>('assistant_usages.reasoning_tokens')
              .as('reasoning_tokens'),
          (eb) =>
            eb.fn
              .sum<string>('assistant_usages.cached_input_tokens')
              .as('cached_input_tokens')
        ])
        .groupBy('assistant_usages.assistant_id')
        .execute()

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
      const result = assistants.map((assistant) => {
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
        .selectFrom('roles')
        .offset((input.page - 1) * input.pageSize)
        .limit(input.pageSize)
        .orderBy('id', 'desc')
        .select(['id', 'name', 'remark'])
        .execute()
      const total = await ctx.db
        .selectFrom('roles')
        .select((eb) => eb.fn.count<string>('id').as('total'))
        .executeTakeFirst()
      return {
        list,
        total: +(total?.total || 0)
      }
    }),
  getRole: adminProcedure.input(z.number()).query(async ({ input, ctx }) => {
    const role = await ctx.db
      .selectFrom('roles')
      .where('id', '=', input)
      .select(['id', 'name', 'remark', 'assistants'])
      .executeTakeFirst()
    const access = await ctx.db
      .selectFrom('access_roles')
      .innerJoin('accesses', 'access_roles.access_id', 'accesses.id')
      .where('role_id', '=', input)
      .select(['access_roles.access_id'])
      .execute()
    return {
      ...role,
      access: access.map((a) => a.access_id)
    }
  }),
  deleteRole: adminProcedure
    .input(z.number())
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.db
        .selectFrom('user_roles')
        .where('role_id', '=', input)
        .selectAll()
        .executeTakeFirst()
      if (user) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '角色已被用户使用，无法删除'
        })
      }
      await ctx.db.transaction().execute(async (trx) => {
        await trx
          .deleteFrom('access_roles')
          .where('role_id', '=', input)
          .execute()
        await trx.deleteFrom('roles').where('id', '=', input).execute()
      })
      return { success: true }
    }),
  createRole: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        remark: z.string().optional(),
        access: z.array(z.string()),
        assistants: z.array(z.number())
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.transaction().execute(async (trx) => {
        const role = await trx
          .insertInto('roles')
          .values({
            name: input.name,
            remark: input.remark,
            assistants: JSON.stringify(input.assistants)
          })
          .returning(['id'])
          .executeTakeFirstOrThrow()
        if (input.access.length) {
          await trx
            .insertInto('access_roles')
            .values(
              input.access.map((access) => ({
                role_id: role.id,
                access_id: access
              }))
            )
            .execute()
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
          assistants: z.array(z.number())
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.transaction().execute(async (trx) => {
        await trx
          .updateTable('roles')
          .set({
            name: input.data.name,
            remark: input.data.remark,
            assistants: JSON.stringify(input.data.assistants) as any
          })
          .where('id', '=', input.id)
          .execute()
        await trx
          .deleteFrom('access_roles')
          .where('role_id', '=', input.id)
          .execute()
        if (input.data.access.length) {
          await trx
            .insertInto('access_roles')
            .values(
              input.data.access.map((access) => ({
                role_id: input.id,
                access_id: access
              }))
            )
            .execute()
        }
        return input.id
      })
    }),
  getAccesses: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.selectFrom('accesses').select(['id']).execute()
  }),
  getAssistantOptions: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.selectFrom('assistants').select(['id', 'name']).execute()
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
      const list = await ctx.db
        .selectFrom('user_roles')
        .innerJoin('users', 'user_roles.user_id', 'users.id')
        .where('user_roles.role_id', '=', input.roleId)
        .select(['users.id', 'users.email', 'users.name'])
        .offset((input.page - 1) * input.pageSize)
        .limit(input.pageSize)
        .execute()
      const total = await ctx.db
        .selectFrom('user_roles')
        .where('role_id', '=', input.roleId)
        .select((eb) => eb.fn.count<string>('user_id').as('total'))
        .executeTakeFirst()
      return {
        list,
        total: +(total?.total || 0)
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
        .deleteFrom('user_roles')
        .where('user_id', '=', input.userId)
        .where('role_id', '=', input.roleId)
        .execute()
      return { success: true }
    }),
  searchMembers: adminProcedure
    .input(
      z.object({
        keyword: z.string().optional()
      })
    )
    .query(async ({ input, ctx }) => {
      return ctx.db
        .selectFrom('users')
        .where((eb) =>
          eb.or([
            eb('name', 'like', `%${input.keyword}%`),
            eb('email', 'like', `%${input.keyword}%`),
            eb('phone', 'like', `%${input.keyword}%`)
          ])
        )
        .orderBy('id', 'desc')
        .select(['id', 'name', 'email'])
        .execute()
    }),
  addRoleToUser: adminProcedure
    .input(
      z.object({
        roleId: z.number(),
        userId: z.number()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const record = await ctx.db
        .selectFrom('user_roles')
        .where('user_id', '=', input.userId)
        .where('role_id', '=', input.roleId)
        .selectAll()
        .executeTakeFirst()
      if (record) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '用户已拥有该角色'
        })
      }
      await ctx.db
        .insertInto('user_roles')
        .values({ user_id: input.userId, role_id: input.roleId })
        .execute()
      return { success: true }
    })
} satisfies TRPCRouterRecord

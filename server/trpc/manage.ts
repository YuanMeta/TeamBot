import { TRPCError, type TRPCRouterRecord } from '@trpc/server'
import z from 'zod'
import { checkLLmConnect } from '../lib/checkConnect'
import { PasswordManager } from '../lib/password'
import { kdb } from '../lib/knex'
import { tid } from 'server/lib/utils'
import { insertRecord, parseRecord } from 'server/lib/table'
import { adminProcedure } from './core'
import { runWebSearch } from 'server/lib/search'
import dayjs from 'dayjs'
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
  getAssistants: adminProcedure.query(async ({ ctx }) => {
    return (
      await ctx.db('assistants').select('*').orderBy('created_at', 'desc')
    ).map((r) => {
      return parseRecord(r)
    })
  }),
  getAssistant: adminProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const record = await ctx.db('assistants').where({ id: input }).first()
      if (!record) return null
      const tools = await ctx
        .db('assistant_tools')
        .where({ assistant_id: input })
        .select('tool_id')
      return {
        ...parseRecord(record),
        tools: tools.map((t) => t.tool_id)
      }
    }),
  updateAssistant: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
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
        await trx('assistants')
          .where({ id: input.id })
          .update(insertRecord(input.data as any))
        await trx('assistant_tools').where({ assistant_id: input.id }).delete()
        if (input.tools.length > 0) {
          await trx('assistant_tools').insert(
            input.tools.map((tool) => ({
              assistant_id: input.id,
              tool_id: tool
            }))
          )
        }
      })
      return { success: true }
    }),
  deleteAssistant: adminProcedure
    .input(
      z.object({
        assistantId: z.string().min(1)
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db.transaction(async (trx) => {
        await trx('assistant_tools')
          .where({ assistant_id: input.assistantId })
          .delete()
        await trx('assistants').where({ id: input.assistantId }).delete()
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
        const [assistant] = await trx('assistants')
          .insert({
            ...insertRecord(input.data as any),
            id: tid()
          })
          .returning('id')
        if (input.tools.length) {
          await trx('assistant_tools').insert(
            input.tools.map((tool) => ({
              assistant_id: assistant.id,
              tool_id: tool
            }))
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
        role: z.enum(['admin', 'member'])
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db('users').insert({
        id: tid(),
        email: input.email,
        password: await PasswordManager.hashPassword(input.password),
        name: input.name,
        role: input.role
      })
    }),
  updateMember: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        email: z.email().optional(),
        password: z.string().min(8).max(50).optional(),
        name: z.string().min(1).optional(),
        role: z.enum(['admin', 'member']).optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx
        .db('users')
        .where({ id: input.userId })
        .update({
          email: input.email,
          password: input.password
            ? await PasswordManager.hashPassword(input.password)
            : null,
          name: input.name,
          role: input.role
        })
    }),
  getMember: adminProcedure.input(z.string()).query(async ({ input, ctx }) => {
    return ctx
      .db('users')
      .where({ id: input })
      .select('id', 'email', 'avatar', 'name', 'role', 'created_at', 'deleted')
      .first()
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
      const db = await kdb()
      const baseQuery = db('users')
      if (input.keyword) {
        baseQuery.whereRaw(`name LIKE '%?%' OR email LIKE '%?%'`, [
          input.keyword,
          input.keyword
        ])
      }
      const members = await baseQuery
        .clone()
        .select('id', 'email', 'name', 'avatar', 'role')
        .orderBy('created_at', 'desc')
        .offset((input.page - 1) * input.pageSize)
        .limit(input.pageSize)
      const total = await baseQuery.clone().count('id', { as: 'total' })
      return { members, total: total[0].total as number }
    }),
  deleteMember: adminProcedure
    .input(
      z.object({
        memberId: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.userId === input.memberId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '不可删除自己的账号'
        })
      }
      await ctx.db('users').where({ id: input.memberId }).update({
        deleted: true
      })
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
      return ctx.db('tools').insert(insertRecord(input))
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
      return ctx
        .db('tools')
        .where({ id: input.id })
        .update(insertRecord(input.data))
    }),
  getTools: adminProcedure
    .input(
      z.object({
        page: z.number(),
        pageSize: z.number()
      })
    )
    .query(async ({ input, ctx }) => {
      const tools = (
        await ctx
          .db('tools')
          .offset((input.page - 1) * input.pageSize)
          .limit(input.pageSize)
          .select('*')
          .orderBy('created_at', 'desc')
      ).map((r) => {
        return parseRecord(r, ['auto'])
      })
      const total = await ctx.db('tools').count('id', { as: 'total' })
      return { tools, total: total[0].total as number }
    }),
  getTool: adminProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const record = await ctx
      .db('tools')
      .where({ id: input })
      .select('*')
      .first()
    return record ? parseRecord(record, ['auto']) : null
  }),
  deleteTool: adminProcedure
    .input(
      z.object({
        toolId: z.string().min(1)
      })
    )
    .mutation(async ({ input, ctx }) => {
      const deps = await ctx
        .db('assistant_tools')
        .where({ tool_id: input.toolId })
        .first()
      if (deps) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '工具已被助手使用，无法删除'
        })
      }
      return ctx.db('tools').where({ id: input.toolId }).delete()
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
      return ctx.db('models').where(input).select('id', 'model', 'provider')
    }),
  getAuthProviders: adminProcedure.query(async ({ ctx }) => {
    return ctx
      .db('auth_providers')
      .select('id', 'name', 'scopes', 'created_at', 'use_pkce', 'updated_at')
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
      return ctx.db('auth_providers').insert({
        id: tid(),
        ...input
      })
    }),
  updateAuthProvider: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
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
      return ctx.db('auth_providers').where({ id: input.id }).update(input.data)
    }),
  deleteAuthProvider: adminProcedure
    .input(
      z.object({
        providerId: z.string().min(1)
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.transaction(async (trx) => {
        await trx('oauth_accounts')
          .where({ provider_id: input.providerId })
          .delete()
        await trx('auth_providers').where({ id: input.providerId }).delete()
      })
    }),
  getAuthProvider: adminProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      return ctx.db('auth_providers').where({ id: input }).select('*').first()
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
        case 'yesterday':
          dateStr = date.subtract(1, 'day').format('YYYY-MM-DD')
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

      const assistants = await ctx
        .db('assistants')
        .select('id', 'name', 'mode')
        .orderBy('created_at', 'desc')

      const usage = await ctx
        .db('assistant_usages')
        .where('assistant_usages.created_at', '>=', dateStr)
        .select('assistant_usages.assistant_id')
        .sum({
          input_tokens: 'assistant_usages.input_tokens',
          output_tokens: 'assistant_usages.output_tokens',
          total_tokens: 'assistant_usages.total_tokens',
          reasoning_tokens: 'assistant_usages.reasoning_tokens',
          cached_input_tokens: 'assistant_usages.cached_input_tokens'
        })
        .groupBy('assistant_usages.assistant_id')

      const usageMap = new Map(
        usage.map((r: any) => [
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
    })
} satisfies TRPCRouterRecord

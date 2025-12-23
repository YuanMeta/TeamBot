import { TRPCError, type TRPCRouterRecord } from '@trpc/server'
import { adminProcedure } from '../core'
import z from 'zod'
import { checkLLmConnect } from '~/.server/lib/connect'
import {
  assistants,
  assistantUsages,
  limits,
  models,
  roleAssistants,
  tools
} from '~/.server/drizzle/schema'
import { and, eq, gte, inArray, isNotNull, ne, sum } from 'drizzle-orm'
import { aesDecrypt, aesEncrypt } from '~/.server/lib/utils'
import { assistantTools } from '~/.server/drizzle/schema'
import dayjs from 'dayjs'
import type { AssistantOptions } from '../../db/type'
import { cacheManage } from '~/.server/lib/cache'
import { mcpManager } from '~/.server/lib/mcp'

export const assistantRouter = {
  getTaskModel: adminProcedure.query(async ({ input, ctx }) => {
    return await ctx.db.query.assistants.findFirst({
      columns: { taskModel: true, id: true },
      where: { taskModel: { isNotNull: true } }
    })
  }),
  addTaskModel: adminProcedure
    .input(
      z.object({
        assistantId: z.number(),
        model: z.string().min(1)
      })
    )
    .mutation(async ({ input, ctx }) => {
      const assistantData = await ctx.db.query.assistants.findFirst({
        columns: {
          id: true,
          mode: true,
          apiKey: true,
          baseUrl: true
        },
        where: { id: input.assistantId }
      })
      await checkLLmConnect({
        api_key: assistantData?.apiKey
          ? await aesDecrypt(assistantData.apiKey)
          : null,
        base_url: assistantData?.baseUrl ?? null,
        mode: assistantData?.mode!,
        models: [input.model]
      })
      await ctx.db.transaction(async (trx) => {
        await trx
          .update(assistants)
          .set({
            taskModel: null
          })
          .where(isNotNull(assistants.taskModel))
        await trx
          .update(assistants)
          .set({ taskModel: input.model })
          .where(eq(assistants.id, input.assistantId))
      })
      await cacheManage.deleteTaskModel()
      return { success: true }
    }),
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
          taskModel: true,
          createdAt: true,
          prompt: true
        },
        orderBy: {
          id: 'desc'
        },
        offset: (input.page - 1) * input.pageSize,
        limit: input.pageSize,
        with: {
          limits: {
            columns: { id: true }
          }
        }
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
      const assistant = await ctx.db.query.assistants.findFirst({
        where: { id: input },
        with: {
          tools: { columns: { id: true, type: true } }
        }
      })
      if (!assistant) return null
      return {
        ...assistant,
        apiKey: assistant.apiKey ? await aesDecrypt(assistant.apiKey) : null,
        tools: assistant.tools
          .filter((t) => t.type !== 'web_search' && t.type !== 'mcp')
          .map((t) => t.id),
        webSearchId: assistant.tools.find((t) => t.type === 'web_search')?.id,
        mcps: assistant.tools.filter((t) => t.type === 'mcp').map((t) => t.id)
      }
    }),
  updateAssistant: adminProcedure
    .input(
      z.object({
        id: z.number(),
        tools: z.string().array(),
        mcps: z.string().array(),
        data: z.object({
          name: z.string().min(1),
          mode: z.string().min(1),
          models: z.array(z.string()).min(1),
          api_key: z.string().nullable(),
          base_url: z.string().nullable(),
          webSearchId: z.string().nullable(),
          prompt: z.string().nullable(),
          options: z.record(z.string(), z.any()) as unknown as AssistantOptions
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db.transaction(async (trx) => {
        await trx
          .delete(assistantTools)
          .where(eq(assistantTools.assistantId, input.id))
        const tools = input.tools
        if (input.data.webSearchId) {
          tools.push(input.data.webSearchId)
        }
        if (input.mcps.length) {
          tools.push(...input.mcps)
          mcpManager.addMcp(input.mcps)
        }
        await trx
          .update(assistants)
          .set({
            name: input.data.name,
            mode: input.data.mode,
            models: input.data.models,
            prompt: input.data.prompt,
            apiKey: input.data.api_key
              ? await aesEncrypt(input.data.api_key)
              : null,
            baseUrl: input.data.base_url,
            options: input.data.options as AssistantOptions
          })
          .where(eq(assistants.id, input.id))
        if (input.tools.length > 0) {
          if (input.tools.length) {
            await trx.insert(assistantTools).values(
              input.tools.map((tool) => {
                return {
                  assistantId: input.id,
                  toolId: tool
                }
              })
            )
          }
        }
      })
      const taskModel = await cacheManage.getTaskModel()
      if (taskModel?.id === input.id) {
        await cacheManage.deleteTaskModel()
      }
      return { success: true }
    }),
  deleteAssistantLimit: adminProcedure
    .input(z.number())
    .mutation(async ({ input, ctx }) => {
      await ctx.db.delete(limits).where(eq(limits.id, input))
      return { success: true }
    }),
  updateAssistantLimit: adminProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          num: z.number(),
          time: z.enum(['day', 'week', 'month'])
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(limits)
        .set({
          num: input.data.num,
          time: input.data.time
        })
        .where(eq(limits.id, input.id))
      return { success: true }
    }),
  addAssistantLimit: adminProcedure
    .input(
      z.object({
        assistantId: z.number(),
        time: z.enum(['day', 'week', 'month']),
        num: z.number()
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db.insert(limits).values({
        assistantId: input.assistantId,
        type: 'chat',
        time: input.time,
        num: input.num
      })
      return { success: true }
    }),
  getAssistantLimit: adminProcedure
    .input(z.number())
    .query(async ({ input, ctx }) => {
      const limit = await ctx.db.query.limits.findFirst({
        where: { assistantId: input, type: 'chat' }
      })
      return limit
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
          .delete(limits)
          .where(eq(limits.assistantId, input.assistantId))
        await trx
          .delete(assistantUsages)
          .where(eq(assistantUsages.assistantId, input.assistantId))
        await trx
          .delete(assistantTools)
          .where(eq(assistantTools.assistantId, input.assistantId))
        await trx
          .delete(roleAssistants)
          .where(eq(roleAssistants.assistantId, input.assistantId))
        await trx.delete(assistants).where(eq(assistants.id, input.assistantId))
      })
      const taskModel = await cacheManage.getTaskModel()
      if (taskModel?.id === input.assistantId) {
        await cacheManage.deleteTaskModel()
      }
      return { success: true }
    }),
  createAssistant: adminProcedure
    .input(
      z.object({
        tools: z.string().array(),
        mcps: z.string().array(),
        data: z.object({
          name: z.string().min(1),
          mode: z.string().min(1),
          models: z.array(z.string()).min(1),
          prompt: z.string().nullable(),
          api_key: z.string().nullable(),
          base_url: z.string().nullable(),
          webSearchId: z.string().nullable(),
          options: z.record(z.string(), z.any()) as unknown as AssistantOptions
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
            models: input.data.models,
            prompt: input.data.prompt,
            apiKey: input.data.api_key
              ? await aesEncrypt(input.data.api_key)
              : null,
            baseUrl: input.data.base_url,
            options: input.data.options as unknown as AssistantOptions
          })
          .returning({ id: assistants.id })
        if (input.data.webSearchId) {
          input.tools.push(input.data.webSearchId)
        }
        if (input.mcps.length) {
          input.mcps.push(...input.mcps)
        }
        if (input.tools.length) {
          await trx.insert(assistantTools).values(
            input.tools.map((tool) => {
              return {
                assistantId: assistant.id,
                toolId: tool
              }
            })
          )
        }
      })
      return { success: true }
    }),

  createTool: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        id: z.string().min(1),
        description: z.string().min(1),
        type: z.enum(['http', 'mcp']),
        params: z.record(z.string(), z.any())
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [existingTool] = await ctx.db
        .select()
        .from(tools)
        .where(eq(tools.id, input.id))
      if (existingTool || input.id === 'web_search') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '工具ID已存在'
        })
      }
      await ctx.db.insert(tools).values({
        id: input.id,
        name: input.name,
        type: input.type,
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
        pageSize: z.number(),
        type: z.enum(['http', 'mcp', 'system']).array()
      })
    )
    .query(async ({ input, ctx }) => {
      const toolsData = await ctx.db.query.tools.findMany({
        columns: {
          id: true,
          name: true,
          type: true,
          createdAt: true,
          description: true,
          params: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        where: {
          type: { in: input.type }
        },
        offset: (input.page - 1) * input.pageSize,
        limit: input.pageSize
      })
      const total = await ctx.db.$count(tools, inArray(tools.type, input.type))
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
      const tool = await ctx.db.query.tools.findFirst({
        where: { id: input.toolId }
      })
      if (tool?.type === 'mcp') {
        await mcpManager.disconnect(input.toolId)
      }
      await ctx.db
        .delete(tools)
        .where(and(eq(tools.id, input.toolId), ne(tools.type, 'system')))
      return { success: true }
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
          provider: models.provider,
          options: models.options
        })
        .from(models)
        .where(whereCondition)
    }),
  getAssistantUsageInfo: adminProcedure
    .input(
      z.object({
        assistantId: z.number(),
        date: z.string()
      })
    )
    .query(async ({ input, ctx }) => {
      let date = dayjs().startOf('day')
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
      const assistant = await ctx.db.query.assistants.findFirst({
        columns: {
          models: true
        },
        where: { id: input.assistantId }
      })
      if (!assistant) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '助手不存在'
        })
      }

      const usage = await ctx.db
        .select({
          model: assistantUsages.model,
          input_tokens: sum(assistantUsages.inputTokens),
          output_tokens: sum(assistantUsages.outputTokens),
          total_tokens: sum(assistantUsages.totalTokens),
          reasoning_tokens: sum(assistantUsages.reasoningTokens),
          cached_input_tokens: sum(assistantUsages.cachedInputTokens)
        })
        .from(assistantUsages)
        .where(
          and(
            eq(assistantUsages.assistantId, input.assistantId),
            gte(assistantUsages.createdAt, date.toDate())
          )
        )
        .groupBy(assistantUsages.model)
      const modelMap = new Map<
        string,
        {
          inputTokens: number
          outputTokens: number
          totalTokens: number
          reasoningTokens: number
          cachedInputTokens: number
        }
      >()
      usage.map((r) =>
        modelMap.set(r.model, {
          inputTokens: Number(r.input_tokens) || 0,
          outputTokens: Number(r.output_tokens) || 0,
          totalTokens: Number(r.total_tokens) || 0,
          reasoningTokens: Number(r.reasoning_tokens) || 0,
          cachedInputTokens: Number(r.cached_input_tokens) || 0
        })
      )

      return assistant.models
        .map((model) => {
          const data = modelMap.get(model)
          return {
            model,
            inputTokens: data?.inputTokens || 0,
            outputTokens: data?.outputTokens || 0,
            totalTokens: data?.totalTokens || 0,
            reasoningTokens: data?.reasoningTokens || 0,
            cachedInputTokens: data?.cachedInputTokens || 0
          }
        })
        .sort((a, b) => b.totalTokens - a.totalTokens)
    }),
  getUsageInfo: adminProcedure
    .input(
      z.object({
        date: z.string()
      })
    )
    .query(async ({ input, ctx }) => {
      let date = dayjs().startOf('day')
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
  getAssistantOptions: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({ id: assistants.id, name: assistants.name })
      .from(assistants)
  })
} satisfies TRPCRouterRecord

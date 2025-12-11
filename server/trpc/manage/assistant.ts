import { TRPCError, type TRPCRouterRecord } from '@trpc/server'
import { adminProcedure } from '../core'
import z from 'zod'
import { checkLLmConnect } from 'server/lib/checkConnect'
import {
  assistants,
  assistantUsages,
  models,
  tools
} from 'server/db/drizzle/schema'
import { eq, gte, sum } from 'drizzle-orm'
import { aesDecrypt, aesEncrypt } from 'server/lib/utils'
import { assistantTools } from 'server/db/drizzle/schema'
import { systemTools } from 'server/lib/tools'
import dayjs from 'dayjs'

export const assistantRouter = {
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
  getSystemTools: adminProcedure.query(() => {
    return systemTools
  }),
  getAssistantOptions: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({ id: assistants.id, name: assistants.name })
      .from(assistants)
  })
} satisfies TRPCRouterRecord

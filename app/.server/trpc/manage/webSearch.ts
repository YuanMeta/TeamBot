import { TRPCError, type TRPCRouterRecord } from '@trpc/server'
import { adminProcedure } from '../core'
import z from 'zod'
import { eq } from 'drizzle-orm'
import { runWebSearch } from '~/.server/lib/search'
import type { WebSearchParams } from '../../db/type'
import type { WebSearchMode } from '~/types'
import { tools } from '~/.server/drizzle/schema'
import { tid } from '~/.server/lib/utils'

export const webSearchRouter = {
  connectSearch: adminProcedure
    .input(
      z.object({
        mode: z.enum(['tavily', 'exa', 'google', 'bocha', 'zhipu']),
        params: z.custom<WebSearchParams>()
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await runWebSearch(
          'Latest news about iPhone',
          input.mode,
          input.params
        )
      } catch (e: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: e.message
        })
      }
    }),
  getWebSearches: adminProcedure
    .input(
      z.object({
        page: z.number(),
        pageSize: z.number()
      })
    )
    .query(async ({ input, ctx }) => {
      const list = await ctx.db.query.tools.findMany({
        columns: {
          params: false
        },
        offset: (input.page - 1) * input.pageSize,
        limit: input.pageSize,
        where: { type: 'web_search' }
      })
      const total = await ctx.db.$count(tools, eq(tools.type, 'web_search'))
      return { list, total }
    }),
  getWebSearch: adminProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      return ctx.db.query.tools.findFirst({
        where: { id: input }
      })
    }),
  deleteWebSearch: adminProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const first = await ctx.db.query.assistants.findFirst({
        where: { tools: { id: input } }
      })
      if (first) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '搜索引擎已被助手使用，无法删除'
        })
      }
      await ctx.db.delete(tools).where(eq(tools.id, input))
      return { success: true }
    }),
  createWebSearch: adminProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().nullish(),
        mode: z.string(),
        params: z.custom<WebSearchParams>()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db
        .insert(tools)
        .values({
          id: tid(),
          name: input.title,
          description: input.description || '',
          webSearchMode: input.mode as WebSearchMode,
          params: input.params,
          type: 'web_search'
        })
        .returning({ id: tools.id })
    }),
  updateWebSearch: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          title: z.string(),
          description: z.string().nullish(),
          mode: z.string(),
          params: z.custom<{
            http?: Record<string, any>
            webSearch?: WebSearchParams
          }>()
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(tools)
        .set({
          name: input.data.title,
          description: input.data.description || '',
          webSearchMode: input.data.mode as WebSearchMode,
          params: input.data.params
        })
        .where(eq(tools.id, input.id))
      return { success: true }
    })
} satisfies TRPCRouterRecord

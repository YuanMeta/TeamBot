import { TRPCError, type TRPCRouterRecord } from '@trpc/server'
import { adminProcedure } from '../core'
import z from 'zod'
import { webSearches } from 'drizzle/schema'
import { eq } from 'drizzle-orm'
import { runWebSearch } from 'server/lib/search'
import type { WebSearchParams } from 'server/db/type'
import type { WebSearchMode } from 'types'

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
      const list = await ctx.db.query.webSearches.findMany({
        columns: {
          params: false
        },
        offset: (input.page - 1) * input.pageSize,
        limit: input.pageSize
      })
      const total = await ctx.db.$count(webSearches)
      return { list, total }
    }),
  getWebSearch: adminProcedure
    .input(z.number())
    .query(async ({ input, ctx }) => {
      return ctx.db.query.webSearches.findFirst({
        where: { id: input }
      })
    }),
  deleteWebSearch: adminProcedure
    .input(z.number())
    .mutation(async ({ input, ctx }) => {
      const first = await ctx.db.query.assistants.findFirst({
        where: { webSearchId: input }
      })
      if (first) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '搜索引擎已被助手使用，无法删除'
        })
      }
      await ctx.db.delete(webSearches).where(eq(webSearches.id, input))
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
        .insert(webSearches)
        .values({
          title: input.title,
          description: input.description,
          mode: input.mode as WebSearchMode,
          params: input.params
        })
        .returning({ id: webSearches.id })
    }),
  updateWebSearch: adminProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          title: z.string(),
          description: z.string().nullish(),
          mode: z.string(),
          params: z.custom<WebSearchParams>()
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(webSearches)
        .set({
          title: input.data.title,
          description: input.data.description,
          mode: input.data.mode as WebSearchMode,
          params: input.data.params
        })
        .where(eq(webSearches.id, input.id))
      return { success: true }
    })
} satisfies TRPCRouterRecord

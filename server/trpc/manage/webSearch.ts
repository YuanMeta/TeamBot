import { TRPCError, type TRPCRouterRecord } from '@trpc/server'
import { adminProcedure } from '../core'
import z from 'zod'
import { webSearches } from 'server/db/drizzle/schema'
import { eq } from 'drizzle-orm'
import { runWebSearch } from 'server/lib/search'

export const webSearchRouter = {
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
        url: z.string(),
        title: z.string(),
        description: z.string(),
        mode: z.string(),
        params: z.record(z.string(), z.any())
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db
        .insert(webSearches)
        .values(input)
        .returning({ id: webSearches.id })
    }),
  updateWebSearch: adminProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          url: z.string(),
          title: z.string(),
          description: z.string(),
          mode: z.string(),
          params: z.record(z.string(), z.any())
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(webSearches)
        .set(input.data)
        .where(eq(webSearches.id, input.id))
      return { success: true }
    })
} satisfies TRPCRouterRecord

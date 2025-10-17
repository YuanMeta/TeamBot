import type { TRPCRouterRecord } from '@trpc/server'
import z from 'zod'
import { procedure } from './core'
import { checkLLmConnect } from '../lib/checkConnect'

export const manageRouter = {
  checkConnect: procedure
    .input(
      z.object({
        mode: z.string().min(1),
        apiKey: z.string().nullable(),
        baseUrl: z.string().nullable(),
        models: z.array(z.string()).min(1)
      })
    )
    .mutation(async ({ input }) => {
      return checkLLmConnect(input)
    }),
  getProviders: procedure.query(async ({ ctx }) => {
    return ctx.db.provider.findMany()
  }),
  getProvider: procedure.input(z.string()).query(async ({ input, ctx }) => {
    return ctx.db.provider.findUnique({
      where: { id: input }
    })
  }),
  updateProvider: procedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        mode: z.string().min(1),
        models: z.array(z.string()).min(1),
        apiKey: z.string().nullable(),
        baseUrl: z.string().nullable()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.provider.update({
        where: { id: input.id },
        data: {
          name: input.name,
          mode: input.mode,
          models: input.models,
          apiKey: input.apiKey,
          baseUrl: input.baseUrl
          // options: input.options
        }
      })
    }),
  createProvider: procedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        mode: z.string().min(1),
        models: z.array(z.string()).min(1),
        apiKey: z.string().nullable(),
        baseUrl: z.string().nullable()
        // options: z.record(z.string(), z.any()).optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.provider.create({
        data: {
          name: input.name,
          mode: input.mode,
          models: input.models,
          apiKey: input.apiKey,
          baseUrl: input.baseUrl
          // options: input.options
        }
      })
    })
} satisfies TRPCRouterRecord

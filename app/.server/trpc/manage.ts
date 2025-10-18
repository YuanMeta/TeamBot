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
  getAssistants: procedure.query(async ({ ctx }) => {
    return ctx.db.assistant.findMany({
      orderBy: { createdAt: 'desc' }
    })
  }),
  getAssistant: procedure.input(z.string()).query(async ({ input, ctx }) => {
    return ctx.db.assistant.findUnique({
      where: { id: input }
    })
  }),
  updateAssistant: procedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        mode: z.string().min(1),
        models: z.array(z.string()).min(1),
        apiKey: z.string().nullable(),
        baseUrl: z.string().nullable(),
        options: z.record(z.string(), z.any())
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.assistant.update({
        where: { id: input.id },
        data: {
          name: input.name,
          mode: input.mode,
          models: input.models,
          apiKey: input.apiKey,
          baseUrl: input.baseUrl,
          options: input.options
        }
      })
    }),
  createAssistant: procedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        mode: z.string().min(1),
        models: z.array(z.string()).min(1),
        apiKey: z.string().nullable(),
        baseUrl: z.string().nullable(),
        options: z.record(z.string(), z.any())
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.assistant.create({
        data: {
          name: input.name,
          mode: input.mode,
          models: input.models,
          apiKey: input.apiKey,
          baseUrl: input.baseUrl,
          options: input.options
        }
      })
    })
} satisfies TRPCRouterRecord

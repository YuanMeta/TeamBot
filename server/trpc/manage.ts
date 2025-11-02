import type { TRPCRouterRecord } from '@trpc/server'
import z from 'zod'
import { procedure } from './core'
import { checkLLmConnect } from '../lib/checkConnect'
import { PasswordManager } from '../lib/password'
import { Prisma } from '@prisma/client'
import { kdb } from '../lib/knex'
import { tid } from 'server/lib/utils'
import { insertRecord, parseRecord } from 'server/lib/table'

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
    return (
      await ctx.db('assistants').select('*').orderBy('created_at', 'desc')
    ).map((r) => {
      return parseRecord(r)
    })
  }),
  getAssistant: procedure.input(z.string()).query(async ({ input, ctx }) => {
    const record = await ctx.db('assistants').where({ id: input }).first()
    if (!record) return null
    return parseRecord(record)
  }),
  updateAssistant: procedure
    .input(
      z.object({
        id: z.string().min(1),
        data: z.object({
          name: z.string().min(1),
          mode: z.string().min(1),
          models: z.array(z.string()).min(1),
          api_key: z.string().nullable(),
          base_url: z.string().nullable(),
          options: z.record(z.string(), z.any()),
          web_search: z.record(z.string(), z.any())
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx
        .db('assistants')
        .where({ id: input.id })
        .update(insertRecord(input.data))
    }),
  createAssistant: procedure
    .input(
      z.object({
        name: z.string().min(1),
        mode: z.string().min(1),
        models: z.array(z.string()).min(1),
        api_key: z.string().nullable(),
        base_url: z.string().nullable(),
        options: z.record(z.string(), z.any()),
        web_search: z.record(z.string(), z.any()).optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db('assistants').insert({
        ...insertRecord(input as any),
        id: tid()
      })
    }),
  createMember: procedure
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
  updateMember: procedure
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
  getMember: procedure.input(z.string()).query(async ({ input, ctx }) => {
    return ctx
      .db('users')
      .where({ id: input })
      .select('id', 'email', 'avatar', 'role', 'created_at', 'deleted')
      .first()
  }),
  getMembers: procedure
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
      return { members, total: total[0].total }
    }),
  deleteMember: procedure
    .input(
      z.object({
        memberId: z.string(),
        deleteData: z.boolean().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.deleteData) {
        while (true) {
          const files = await ctx
            .db('message_files')
            .where({ user_id: input.memberId })
            .select('id')
            .limit(100)
          if (files.length > 0) {
            await ctx
              .db('messages')
              .whereIn(
                'id',
                files.map((files) => files.id)
              )
              .delete()
          }
          if (files.length < 100) {
            break
          }
        }
      } else {
        return ctx.db('users').where({ id: input.memberId }).update({
          deleted: true
        })
      }
    })
} satisfies TRPCRouterRecord

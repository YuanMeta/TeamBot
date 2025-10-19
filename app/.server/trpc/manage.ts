import type { TRPCRouterRecord } from '@trpc/server'
import z from 'zod'
import { procedure } from './core'
import { checkLLmConnect } from '../lib/checkConnect'
import { PasswordManager } from '../lib/password'
import type { ChatFile } from '~/types'
import type { Prisma } from '@prisma/client'

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
      return ctx.db.user.create({
        data: {
          email: input.email,
          password: await PasswordManager.hashPassword(input.password),
          name: input.name,
          role: input.role
        },
        select: { id: true }
      })
    }),
  updateMember: procedure
    .input(
      z.object({
        userId: z.string(),
        email: z.email(),
        password: z.string().min(8).max(50),
        name: z.string().min(1),
        role: z.enum(['admin', 'user'])
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.user.update({
        where: { id: input.userId },
        data: {
          email: input.email,
          password: await PasswordManager.hashPassword(input.password),
          name: input.name,
          role: input.role
        }
      })
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
      const where: Prisma.UserWhereInput = {}
      if (input.keyword) {
        where.OR = [
          { name: { contains: input.keyword } },
          { email: { contains: input.keyword } }
        ]
      }
      const members = await ctx.db.user.findMany({
        where,
        select: { id: true, email: true, name: true, avatar: true, role: true },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize
      })
      const total = await ctx.db.user.count({
        where
      })
      return { members, total }
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
          const messages = await ctx.db.message.findMany({
            where: {
              userId: input.memberId
            },
            take: 100
          })
          if (messages.length > 0) {
            const removeFile = messages.reduce((acc, message) => {
              let removePath: string[] = []
              let files: ChatFile[] = message.files as unknown as ChatFile[],
                images: ChatFile[] = message.images as unknown as ChatFile[]
              if (files?.length) {
                for (let file of files) {
                  if (file.path) {
                    removePath.push(file.path)
                  }
                }
              }
              if (images?.length) {
                for (let image of images) {
                  if (image.path) {
                    removePath.push(image.path)
                  }
                }
              }
              return removePath
            }, [] as string[])
            if (removeFile.length) {
              // 删除文件
            }
          }
          if (messages.length < 100) {
            break
          }
        }
        return await ctx.db.$transaction(async (t) => {
          await t.message.deleteMany({
            where: {
              userId: input.memberId
            }
          })
          await t.chat.deleteMany({
            where: { userId: input.memberId }
          })
          await t.relationIdp.deleteMany({
            where: { userId: input.memberId }
          })
          await t.user.delete({
            where: { id: input.memberId }
          })
        })
      } else {
        return ctx.db.user.update({
          where: { id: input.memberId },
          data: {
            deleted: true
          }
        })
      }
    })
} satisfies TRPCRouterRecord

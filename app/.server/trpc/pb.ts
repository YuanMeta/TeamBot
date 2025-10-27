import z from 'zod'
import { publicProcedure } from './core'
import { userCookie } from '../session'
import { prisma } from '../lib/prisma'
import { TRPCError } from '@trpc/server'
import { generateToken, PasswordManager, verifyToken } from '../lib/password'
export const pbRouter = {
  login: publicProcedure
    .input(
      z.object({
        nameOrEmail: z.string().min(1),
        password: z.string().min(6)
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: input.nameOrEmail }, { name: input.nameOrEmail }]
        },
        select: { id: true, password: true }
      })
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }
      if (
        await PasswordManager.verifyPassword(
          input.password,
          user.password || ''
        )
      ) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid password'
        })
      }
      const token = generateToken({ uid: user.id })
      ctx.request.headers.set(
        'Set-Cookie',
        await userCookie.serialize({ token })
      )
      return { success: true }
    })
}

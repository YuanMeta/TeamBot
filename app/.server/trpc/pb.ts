import z from 'zod'
import { publicProcedure } from './core'
import { userCookie } from '../session'
import { prisma } from '../lib/prisma'
import { TRPCError } from '@trpc/server'
import { generateToken, PasswordManager } from '../lib/password'

// 防暴力破解：登录尝试记录
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()
const MAX_ATTEMPTS = 5
const LOCK_DURATION = 15 * 60 * 1000

function recordFailedAttempt(key: string) {
  const attempts = loginAttempts.get(key) || { count: 0, lockedUntil: 0 }
  attempts.count += 1

  if (attempts.count >= MAX_ATTEMPTS) {
    attempts.lockedUntil = Date.now() + LOCK_DURATION
  }

  loginAttempts.set(key, attempts)

  setTimeout(() => {
    loginAttempts.delete(key)
  }, LOCK_DURATION)
}

export const pbRouter = {
  login: publicProcedure
    .input(
      z.object({
        nameOrEmail: z.string().min(1),
        password: z.string().min(6)
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 检查登录尝试次数限制
      const attemptKey = `login:${input.nameOrEmail}`
      const attempts = loginAttempts.get(attemptKey) || {
        count: 0,
        lockedUntil: 0
      }

      if (attempts.lockedUntil > Date.now()) {
        const remainingMinutes = Math.ceil(
          (attempts.lockedUntil - Date.now()) / 60000
        )
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `账户已被锁定，请在 ${remainingMinutes} 分钟后重试`
        })
      }

      if (attempts.lockedUntil > 0 && attempts.lockedUntil <= Date.now()) {
        loginAttempts.delete(attemptKey)
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: input.nameOrEmail }, { name: input.nameOrEmail }]
        },
        select: { id: true, password: true, deleted: true }
      })

      const invalidCredentialsError = new TRPCError({
        code: 'UNAUTHORIZED',
        message: '用户名或密码错误'
      })

      if (!user) {
        recordFailedAttempt(attemptKey)
        throw invalidCredentialsError
      }

      if (user.deleted) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '该账户已被禁用'
        })
      }

      if (!user.password) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '该账户未设置密码，请联系管理员'
        })
      }

      // 验证密码（修复逻辑错误：验证失败才抛出错误）
      const isPasswordValid = await PasswordManager.verifyPassword(
        input.password,
        user.password
      )

      if (!isPasswordValid) {
        recordFailedAttempt(attemptKey)
        throw invalidCredentialsError
      }

      // 登录成功，清除失败记录
      loginAttempts.delete(attemptKey)

      const token = generateToken({ uid: user.id })
      ctx.request.headers.set(
        'Set-Cookie',
        await userCookie.serialize({ token })
      )
      return { success: true }
    })
}

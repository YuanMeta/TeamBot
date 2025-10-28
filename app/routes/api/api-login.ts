import z from 'zod'
import type { Route } from './+types/api-login'
import { TRPCError } from '@trpc/server'
import { prisma } from '~/.server/lib/prisma'
import { generateToken, PasswordManager } from '~/.server/lib/password'
import { userCookie } from '~/.server/session'
import { redirect } from 'react-router'

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

const InputSchema = z.object({
  nameOrEmail: z.string().min(1),
  password: z.string().min(6)
})

export async function action({ request }: Route.LoaderArgs) {
  const input: { nameOrEmail: string; password: string } = await request.json()
  try {
    InputSchema.parse(input)
  } catch (e) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: (e as Error).message
    })
  }
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
  return redirect('/chat', {
    headers: {
      'Set-Cookie': await userCookie.serialize({ token })
    }
  })
}

import type { Express } from 'express'
import type { Knex } from 'knex'
import z from 'zod'
import { generateToken, PasswordManager } from '../lib/password'
import { userCookie } from '../session'
import { completions } from './completions'

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

const LoginInputSchema = z.object({
  nameOrEmail: z.string().min(1),
  password: z.string().min(6)
})

export const registerRoutes = (app: Express, db: Knex) => {
  app.post('/api/login', async (req, res) => {
    const input: { nameOrEmail: string; password: string } = req.body
    try {
      LoginInputSchema.parse(input)
    } catch (e) {
      throw new Response((e as Error).message, { status: 400 })
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
      throw new Response(`账户已被锁定，请在 ${remainingMinutes} 分钟后重试`, {
        status: 429
      })
    }

    if (attempts.lockedUntil > 0 && attempts.lockedUntil <= Date.now()) {
      loginAttempts.delete(attemptKey)
    }
    const user = await db('users')
      .where({ name: input.nameOrEmail })
      .orWhere({ email: input.nameOrEmail })
      .first()
    if (!user) {
      recordFailedAttempt(attemptKey)
      throw new Response(`用户名或密码错误`, {
        status: 429
      })
    }

    if (user.deleted) {
      throw new Response('该账户已被禁用', { status: 401 })
    }

    if (!user.password) {
      throw new Response('该账户未设置密码，请联系管理员', { status: 401 })
    }

    const isPasswordValid = await PasswordManager.verifyPassword(
      input.password,
      user.password
    )

    if (!isPasswordValid) {
      recordFailedAttempt(attemptKey)
      throw new Response('用户名或密码错误', { status: 401 })
    }

    // 登录成功，清除失败记录
    loginAttempts.delete(attemptKey)
    const token = generateToken({ uid: user.id })
    res.setHeader('Set-Cookie', await userCookie.serialize(token))
    res.json({
      success: true
    })
  })

  app.post('/api/logout', async (req, res) => {
    const clearedCookie = await userCookie.serialize('', {
      maxAge: 0
    })
    res.setHeader('Set-Cookie', clearedCookie)
    res.json({
      success: true
    })
  })

  app.post('/api/completions', async (req, res) => {
    await completions(req, res, db)
  })
}

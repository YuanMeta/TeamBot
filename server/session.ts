import { createCookie } from 'react-router'
import { verifyToken } from './lib/password'
import type { Request } from 'express'
import { kdb } from './lib/knex'
import { cacheable } from './lib/cache'

const isProduction = process.env.NODE_ENV === 'production'

// 生产环境必须设置 COOKIE_SECRET
if (isProduction && !process.env.COOKIE_SECRET) {
  throw new Error(
    'COOKIE_SECRET environment variable must be set in production'
  )
}

export const userCookie = createCookie('user', {
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
  maxAge: 604_800, // one week
  secrets: [process.env.COOKIE_SECRET || 's3cr3t']
})

export const oauthStateCookie = createCookie('oauth_state', {
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
  maxAge: 600,
  secrets: [process.env.COOKIE_SECRET || 's3cr3t']
})

export const getUserId = async (request: Request) => {
  const token = await userCookie.parse(request.headers.cookie || '')
  if (!token) {
    return null
  }
  const data = verifyToken(token)
  return data?.uid || null
}

export const verifyUser = async (cookie: string, admin = false) => {
  const token = await userCookie.parse(cookie)
  if (!token) {
    return false
  }
  const data = verifyToken(token)
  if (!data) {
    return false
  }
  const db = await kdb()
  let user = await cacheable.get<{
    id: string
    role: 'admin' | 'member'
    deleted: boolean
  }>(`user:${data.uid}`)
  if (!user) {
    user = await db('users')
      .where({ id: data.uid })
      .select('id', 'role', 'deleted')
      .first()
    if (user) {
      cacheable.set(`user:${user.id}`, user, 60 * 60 * 12 * 1000)
    }
  }
  if (!user || (admin && user.role !== 'admin') || user.deleted) {
    return false
  }
  return user
}

export const deleteUserCache = async (userId: string) => {
  return await cacheable.delete(`user:${userId}`)
}

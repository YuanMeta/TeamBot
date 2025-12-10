import { createCookie } from 'react-router'
import { verifyToken } from './lib/password'
import type { Request } from 'express'
import { cacheable } from './lib/cache'
import { db } from './db'

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

export const getUser = async (request: Request) => {
  const token = await userCookie.parse(request.headers.cookie || '')
  if (!token) {
    return null
  }
  return verifyToken(token)
}

export const verifyUser = async (cookie: string) => {
  const token = await userCookie.parse(cookie)
  if (!token) {
    return false
  }
  const data = verifyToken(token)
  if (!data) {
    return false
  }
  let user = await cacheable.get<{
    id: number
    root: boolean | null
  }>(`user:${data.uid}`)
  if (!user) {
    user = await db.query.users.findFirst({
      where: { id: data.uid, deleted: false },
      columns: { id: true, root: true }
    })
    if (user) {
      cacheable.set(`user:${user.id}`, user, 60 * 60 * 12 * 1000)
    }
  }
  if (!user) {
    return false
  }
  return user
}

export const deleteUserCache = async (userId: number) => {
  return await cacheable.delete(`user:${userId}`)
}

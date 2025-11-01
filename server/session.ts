import { createCookie } from 'react-router'
import { verifyToken } from './lib/password'
import type { Request } from 'express'
// const isProduction = process.env.NODE_ENV === 'production'

export const userCookie = createCookie('user', {
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
  maxAge: 604_800, // one week
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

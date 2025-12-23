import type { MiddlewareHandler } from 'hono'
import { verifyUser } from '../session'

export const apiInterceptor: MiddlewareHandler = async (c, next) => {
  const cookie = c.req.header('cookie')
  const user = await verifyUser(cookie || '')
  if (!user) {
    return c.redirect('/login')
  }
  await next()
}

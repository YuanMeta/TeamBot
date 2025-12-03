import type { NextFunction, Request, Response } from 'express'
import { verifyUser } from 'server/session'

type RouteHandler = (
  req: Request,
  res: Response,
  next?: NextFunction
) => Promise<any> | any

export const routeInterceptor = (handler: RouteHandler) => {
  return async (req: Request, res: Response, next?: NextFunction) => {
    const cookie = req.headers.cookie
    const user = await verifyUser(cookie || '')
    if (!user) {
      res.redirect('/login')
      return
    }
    await handler(req, res, next)
  }
}

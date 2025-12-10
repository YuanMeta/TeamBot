import 'react-router'
import { createRequestHandler } from '@react-router/express'
import express from 'express'
import * as trpcExpress from '@trpc/server/adapters/express'
import { appRouter } from './trpc/router'
import { createContext } from './trpc/core'
import { registerRoutes } from './routes/api'
import { TRPCError } from '@trpc/server'
import { getHTTPStatusCodeFromError } from '@trpc/server/http'
import { fetchOpenRouterModels } from './lib/openRouterModels'
import { getUser } from './session'
import { initDbData } from './db/init'
import { db, type DbInstance } from './db'
declare module 'react-router' {
  interface AppLoadContext {
    db: DbInstance
    userId: number | null
    root: boolean
  }
}
initDbData(db)
fetchOpenRouterModels(db)

export const app = express()
app.use(
  express.json({
    limit: '20mb'
  })
)
registerRoutes(app, db)

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext
  })
)

app.use(
  createRequestHandler({
    build: () => import('virtual:react-router/server-build'),
    getLoadContext: async (req) => {
      const user = await getUser(req)
      return {
        db,
        userId: user?.uid!,
        root: user?.root!
      }
    }
  })
)

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err)
    if (err instanceof TRPCError) {
      const httpCode = getHTTPStatusCodeFromError(err)
      res.status(httpCode).json({ message: err.message })
      return
    }
    res.status(500).json({ error: err })
  }
)

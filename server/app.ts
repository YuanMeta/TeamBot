import 'react-router'
import { createRequestHandler } from '@react-router/express'
import express from 'express'
import * as trpcExpress from '@trpc/server/adapters/express'
import { appRouter } from './trpc/router'
import { createContext } from './trpc/core'
import { kdb } from './lib/knex'
import { registerRoutes } from './routes/api'
import type { Knex } from 'knex'
import { TRPCError } from '@trpc/server'
import { getHTTPStatusCodeFromError } from '@trpc/server/http'

declare module 'react-router' {
  interface AppLoadContext {
    db: Knex
  }
}

const db = await kdb()
export const app = express()
app.use(
  express.json({
    limit: '10mb'
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
    getLoadContext() {
      return {
        db
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

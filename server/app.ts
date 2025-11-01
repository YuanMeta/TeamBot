import 'react-router'
import { createRequestHandler } from '@react-router/express'
import express from 'express'
import * as trpcExpress from '@trpc/server/adapters/express'
import { appRouter } from './trpc/router'
import { createContext } from './trpc/core'
import { kdb } from './lib/knex'
import { registerRoutes } from './routes/api'
import type { Knex } from 'knex'

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

// React Router handler 作为兜底，放在最后
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

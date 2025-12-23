import { createHonoServer } from 'react-router-hono-server/node'
import { Hono } from 'hono'
import { db, type DbInstance } from './.server/db'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from './.server/trpc/router'
import { getUser } from './.server/session'
import { apiInterceptor } from './.server/routes/interceptor'
import { registerRoutes } from './.server/routes/api'
import { compress } from 'hono/compress'
import { initDbData } from './.server/db/init'
import { fetchOpenRouterModels } from './.server/lib/openRouterModels'
import { requests } from './.server/drizzle/schema'
import { lt } from 'drizzle-orm'
import cron from 'node-cron'
import dayjs from 'dayjs'
import { mcpManager } from './.server/lib/mcp'
import { gracefulShutdown } from './.server/lib/shutdown'
declare module 'react-router' {
  interface AppLoadContext {
    db: DbInstance
    userId: number | null
    root: boolean
  }
}

initDbData(db)
fetchOpenRouterModels(db)

const app = new Hono()
app.use('*', compress())
app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: async (_opts, c) => {
      const user = await getUser(c.req.raw)
      return {
        db,
        userId: user?.uid!,
        root: user?.root!,
        req: c.req.raw
      }
    }
  })
)
app.use('/api/*', apiInterceptor)
app.use('/stream/*', apiInterceptor)
registerRoutes(app, db)

cron.schedule('0 2 * * *', () => {
  const date = dayjs()
  db.delete(requests).where(
    lt(requests.createdAt, date.startOf('month').subtract(1, 'month').toDate())
  )
})

export default await createHonoServer({
  app,
  async getLoadContext(c) {
    const user = await getUser(c.req.raw)
    return {
      db,
      userId: user?.uid!,
      root: user?.root!
    }
  }
})
mcpManager.init()

process.on('SIGINT', () => gracefulShutdown())
process.on('SIGTERM', () => gracefulShutdown())

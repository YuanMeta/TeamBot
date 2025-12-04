import { createCallerFactory, createTRPCRouter } from './core'
import { manageRouter } from './manage'
import { chatRouter } from './chat'
import { commonRouter } from './common'

export const appRouter = createTRPCRouter({
  manage: manageRouter,
  chat: chatRouter,
  common: commonRouter
})

export type AppRouter = typeof appRouter

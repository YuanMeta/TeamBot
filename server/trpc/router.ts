import { createCallerFactory, createTRPCRouter } from './core'
import { manageRouter } from './manage'
import { chatRouter } from './chat'

export const appRouter = createTRPCRouter({
  manage: manageRouter,
  chat: chatRouter
})

export type AppRouter = typeof appRouter

appRouter.chat.createChat

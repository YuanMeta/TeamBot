import type { LoaderFunctionArgs } from 'react-router'
import {
  createCallerFactory,
  createTRPCContext,
  createTRPCRouter
} from './core'
import { manageRouter } from './manage'
import { chatRouter } from './chat'

export const appRouter = createTRPCRouter({
  manage: manageRouter,
  chat: chatRouter
})

export type AppRouter = typeof appRouter

export const createCaller = createCallerFactory(appRouter)
export const caller = async (loaderArgs: LoaderFunctionArgs) =>
  createCaller(await createTRPCContext({ headers: loaderArgs.request.headers }))

// const api = await caller(loaderArgs)

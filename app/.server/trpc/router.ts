import type { LoaderFunctionArgs } from 'react-router'
import {
  createCallerFactory,
  createTRPCContext,
  createTRPCRouter
} from './core'
import { manageRouter } from './manage'
import { chatRouter } from './chat'
import { pbRouter } from './pb'

export const appRouter = createTRPCRouter({
  manage: manageRouter,
  chat: chatRouter,
  pb: pbRouter
})

export type AppRouter = typeof appRouter

export const createCaller = createCallerFactory(appRouter)
export const caller = async (loaderArgs: LoaderFunctionArgs) =>
  createCaller(await createTRPCContext({ request: loaderArgs.request }))

// const api = await caller(loaderArgs)

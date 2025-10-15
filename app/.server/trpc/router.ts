import type { LoaderFunctionArgs } from 'react-router'
import {
  createCallerFactory,
  createTRPCContext,
  createTRPCRouter
} from './core'
import { userRouter } from './user'

export const appRouter = createTRPCRouter({
  user: userRouter
})

export type AppRouter = typeof appRouter

export const createCaller = createCallerFactory(appRouter)
export const caller = async (loaderArgs: LoaderFunctionArgs) =>
  createCaller(await createTRPCContext({ headers: loaderArgs.request.headers }))

// const api = await caller(loaderArgs)

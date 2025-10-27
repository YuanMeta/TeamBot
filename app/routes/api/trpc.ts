import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { createTRPCContext } from '~/.server/trpc/core'
import { appRouter } from '~/.server/trpc/router'

export const loader = async (args: LoaderFunctionArgs) => {
  return handleRequest(args)
}

export const action = async (args: ActionFunctionArgs) => {
  return handleRequest(args)
}

function handleRequest(args: LoaderFunctionArgs | ActionFunctionArgs) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: args.request,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        request: args.request
      })
  })
}

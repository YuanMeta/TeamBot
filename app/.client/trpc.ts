import SuperJSON from 'superjson'
import { createTRPCClient, httpBatchLink, loggerLink } from '@trpc/client'
import type { AppRouter } from '~/.server/trpc/router'
export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      transformer: SuperJSON,
      url: '/api/trpc',
      headers() {
        const headers = new Headers()
        headers.set('authorization', '')
        return headers
      }
    })
  ]
})

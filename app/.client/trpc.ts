import SuperJSON from 'superjson'
import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client'
import type { AppRouter } from '~/.server/trpc/router'
import type { ChatStore } from '~/routes/chat/store/store'
export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      transformer: SuperJSON,
      url: '/trpc',
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include'
        }).then(async (res) => {
          if (res.status === 401) {
            location.replace('/login')
            return res
          }
          const data = await res.json()
          const error = data instanceof Array ? data?.[0].error : data?.error
          if (error || !res.ok) {
            throw new TRPCClientError(error?.json?.message, {
              meta: error.json
            })
          }
          if (error || !res.ok) {
            // const msg = error?.json?.message as string
            // if (msg) {
            //   toast(<div className='text-orange-500'>{msg}</div>, {
            //     closeButton: true
            //   })
            // }
            // if (res.status === 401 || error?.data?.httpStatus === 401) {
            //   setTimeout(async () => {
            //     localStorage.removeItem('token')
            //   }, 1000)
            // }
            // throw new Error()
          }
          return {
            ...res,
            json: () => Promise.resolve(data)
          }
        })
      },
      headers() {
        const headers = new Headers()
        headers.set('authorization', '')
        return headers
      }
    })
  ]
})

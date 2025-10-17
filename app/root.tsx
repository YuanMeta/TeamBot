import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  type LoaderFunctionArgs
} from 'react-router'
import { observer } from 'mobx-react-lite'

import type { Route } from './+types/root'
import { themeSessionResolver } from './.server/session'
import './app.css'
import { PreventFlashOnWrongTheme, ThemeProvider, useTheme } from 'remix-themes'
import { Toaster } from '~/components/ui/sonner'

export async function loader({ request }: LoaderFunctionArgs) {
  const { getTheme } = await themeSessionResolver(request)
  return {
    theme: getTheme()
  }
}

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous'
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap'
  }
]

// export function Layout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang='en'>
//       <head>
//         <meta charSet='utf-8' />
//         <meta name='viewport' content='width=device-width, initial-scale=1' />
//         <Meta />
//         <Links />
//       </head>
//       <body>
//         {children}
//         <ScrollRestoration />
//         <Scripts />
//       </body>
//     </html>
//   )
// }

export default function AppWithProviders() {
  const data = useLoaderData()
  return (
    <ThemeProvider specifiedTheme={data.theme} themeAction='/set-theme'>
      <App />
    </ThemeProvider>
  )
}

const App = observer(() => {
  const data = useLoaderData()
  const [theme] = useTheme()
  return (
    <html lang='en' className={theme ?? ''}>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width,initial-scale=1' />
        <Meta />
        <PreventFlashOnWrongTheme ssrTheme={Boolean(data.theme)} />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <Toaster />
      </body>
    </html>
  )
})

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!'
  let details = 'An unexpected error occurred.'
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error'
    details =
      error.status === 404
        ? 'The requested page could not be found.'
        : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className='pt-16 p-4 container mx-auto'>
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className='w-full p-4 overflow-x-auto'>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}

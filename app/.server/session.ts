import { createCookieSessionStorage } from 'react-router'
import { createThemeSessionResolver } from 'remix-themes'
import { userCookie } from 'server/session'

const isProduction = process.env.NODE_ENV === 'production'

// 生产环境必须设置 COOKIE_SECRET
if (isProduction && !process.env.COOKIE_SECRET) {
  throw new Error(
    'COOKIE_SECRET environment variable must be set in production'
  )
}

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'theme',
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secrets: [process.env.COOKIE_SECRET || 's3cr3t'],
    secure: false
    // Set domain and secure only if in production
    // ...(isProduction
    //   ? { domain: 'your-production-domain.com', secure: true }
    //   : {})
  }
})

export const themeSessionResolver = createThemeSessionResolver(sessionStorage)

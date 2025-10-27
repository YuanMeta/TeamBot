import { createCookieSessionStorage } from 'react-router'
import { createThemeSessionResolver } from 'remix-themes'
import { createCookie } from 'react-router'

const isProduction = process.env.NODE_ENV === 'production'

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'theme',
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secrets: ['s3cr3t']
    // Set domain and secure only if in production
    // ...(isProduction
    //   ? { domain: 'your-production-domain.com', secure: true }
    //   : {})
  }
})

export const themeSessionResolver = createThemeSessionResolver(sessionStorage)

export const userCookie = createCookie('user', {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  maxAge: 604_800 // one week
})

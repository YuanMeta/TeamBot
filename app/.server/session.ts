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
    secrets: ['s3cr3t'],
    secure: false
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
  secure: false,
  maxAge: 604_800, // one week
  secrets: [process.env.COOKIE_SECRET || 's3cr3t'] // 添加签名密钥
})

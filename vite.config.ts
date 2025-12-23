import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { reactRouterHonoServer } from 'react-router-hono-server/dev'

export default defineConfig(({ isSsrBuild }) => ({
  build: {
    rollupOptions: isSsrBuild
      ? {
          input: './server/app.ts'
        }
      : undefined
  },
  plugins: [
    tailwindcss(),
    reactRouterHonoServer(),
    reactRouter(),
    tsconfigPaths()
  ],
  ssr: {
    noExternal: ['@lobehub/icons', '@lobehub/ui', '@lobehub/fluent-emoji']
  }
}))

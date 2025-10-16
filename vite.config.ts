import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  ssr: {
    noExternal: ['@lobehub/icons', '@lobehub/ui', '@lobehub/fluent-emoji']
  },
  optimizeDeps: {
    include: ['@lobehub/icons', '@lobehub/ui', '@lobehub/fluent-emoji']
  }
})

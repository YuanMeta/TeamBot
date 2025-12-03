import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ isSsrBuild, mode }) => ({
  build: {
    rollupOptions: isSsrBuild
      ? {
          input: './server/app.ts'
        }
      : undefined
  },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  ssr: {
    noExternal: ['@lobehub/icons', '@lobehub/ui', '@lobehub/fluent-emoji']
  }
  // 安全配置：限制静态文件访问
  // publicDir: 'public', // 只允许 public 目录作为静态资源目录
  // server: {
  //   fs: {
  //     strict: true,
  //     // 只允许 Vite 访问这些特定目录（用于模块解析和开发）
  //     allow: [
  //       './app', // 前端应用代码
  //       './node_modules', // npm 依赖
  //       './public', // 公共静态资源
  //       './types' // TypeScript 类型定义
  //     ]
  //   }
  // }
}))

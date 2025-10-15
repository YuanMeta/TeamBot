import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('ai-stream', 'routes/ai-stream.tsx'),
  route('ai-chat', 'routes/ai-chat.tsx'),
  // 捕获所有未匹配的路由，包括 Chrome DevTools 请求
  route('*', 'routes/404.tsx')
] satisfies RouteConfig

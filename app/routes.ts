import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('chat/completions', 'routes/chat/completions.ts'),
  route('chat/title', 'routes/chat/title.ts'),
  route('api/trpc/*', 'routes/api/trpc.ts'),
  route('api/set-theme', 'routes/api/set-theme.ts'),
  route('chat/:id?', 'routes/chat/chat.tsx'),
  route('login', 'routes/login.tsx'),
  route('api/api-login', 'routes/api/api-login.ts'),
  route('api/logout', 'routes/api/logout.ts'),
  route('manage', 'routes/manage/manage.tsx', [
    index('routes/manage/index.tsx'),
    {
      path: 'assistant',
      file: 'routes/manage/assistant.tsx'
    },
    {
      path: 'sso',
      file: 'routes/manage/sso.tsx'
    },
    {
      path: 'member',
      file: 'routes/manage/member.tsx'
    }
  ]),
  route('*', 'routes/404.tsx')
] satisfies RouteConfig

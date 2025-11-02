import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('set-theme', 'routes/set-theme.ts'),
  route('chat/:id?', 'routes/chat/chat.tsx'),
  route('login', 'routes/login.tsx'),
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

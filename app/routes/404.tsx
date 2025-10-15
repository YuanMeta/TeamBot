import type { Route } from './+types/404'

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)

  // 对于 Chrome DevTools 和其他特殊请求，返回空响应
  if (
    url.pathname.includes('/.well-known/') ||
    url.pathname.includes('favicon.ico') ||
    url.pathname.includes('.map')
  ) {
    return new Response(null, { status: 404 })
  }

  return null
}

export default function NotFound() {
  return (
    <div className='min-h-screen bg-gray-100 flex items-center justify-center'>
      <div className='text-center'>
        <h1 className='text-6xl font-bold text-gray-800 mb-4'>404</h1>
        <p className='text-xl text-gray-600 mb-8'>页面未找到</p>
        <a
          href='/'
          className='px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
        >
          返回首页
        </a>
      </div>
    </div>
  )
}

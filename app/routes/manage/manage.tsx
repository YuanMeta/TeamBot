import { Outlet, redirect } from 'react-router'
import { observer } from 'mobx-react-lite'
import { ManageSideBar } from './ui/SideBar'
import { AccessProvider } from '~/lib/access'
import type { Route } from './+types/manage'
import { isAdmin } from 'server/db/query'
import { theme, ConfigProvider, message } from 'antd'
import { useTheme } from 'remix-themes'
import zhCN from 'antd/locale/zh_CN'
import 'dayjs/locale/zh-cn'
import { useSubject } from '~/hooks/localState'
import { adminConfirmDialog$ } from '~/components/project/confirm-dialog'
export const loader = async ({ context }: Route.LoaderArgs) => {
  if (context.root) {
    return null
  }
  const pass = await isAdmin(context.db, context.userId!)
  if (pass) {
    return null
  }
  return redirect('/chat')
}
export default observer(() => {
  const [themeMode] = useTheme()
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#13c2c2',
          borderRadius: 8,
          colorError: '#c94043'
        },
        components: {
          Button: {
            boxShadow: 'none',
            primaryColor:
              themeMode !== 'dark'
                ? 'rgba(255,255,255,1)'
                : 'rgba(10, 10, 10, 1)',
            colorPrimary:
              themeMode === 'dark'
                ? 'rgba(255,255,255,1)'
                : 'rgba(10, 10, 10, 1)',
            colorPrimaryHover:
              themeMode === 'dark'
                ? 'rgba(255,255,255, .85)'
                : 'rgba(10, 10, 10, .85)'
          }
        },
        algorithm:
          themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm
      }}
    >
      <AccessProvider>
        <ManageSideBar>
          <div className={'overflow-y-auto h-0 flex-1 p-4'}>
            <div className={'max-w-[1400px] mx-auto'}>
              <Outlet />
            </div>
          </div>
        </ManageSideBar>
      </AccessProvider>
    </ConfigProvider>
  )
})

import {
  BotMessageSquare,
  Waypoints,
  Users,
  CircleGauge,
  Wrench
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'
import {
  SidebarGroup,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '~/components/ui/sidebar'
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '~/components/ui/sidebar'
import { observer } from 'mobx-react-lite'

// Menu items.
const items = [
  {
    title: 'AI助手',
    url: '/manage/assistant',
    icon: BotMessageSquare
  },
  {
    title: '成员',
    url: '/manage/member',
    icon: Users
  },
  {
    title: '模型工具',
    url: '/manage/tool',
    icon: Wrench
  },
  {
    title: '模型用量',
    url: '/manage/usage',
    icon: CircleGauge
  },
  {
    title: 'SSO',
    url: '/manage/sso',
    icon: Waypoints
  }
]

export default observer(() => {
  let location = useLocation()
  return (
    <SidebarProvider>
      <Sidebar variant={'sidebar'} collapsible={'icon'}>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={location.pathname === item.url}
                  >
                    <NavLink to={item.url} end>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <main className={'flex flex-col flex-1 max-h-screen'}>
          <div className={'flex items-center justify-between h-10 px-2'}>
            <div>
              <SidebarTrigger />
            </div>
          </div>
          <div className={'overflow-y-auto h-0 flex-1 p-4'}>
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
})

import { BotMessageSquare, Waypoints, Users, CircleGauge } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar'
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
    title: 'Provider',
    url: '/manage/provider',
    icon: BotMessageSquare
  },
  {
    title: 'SSO',
    url: '/manage/sso',
    icon: Waypoints
  },
  {
    title: 'User',
    url: '/manage/user',
    icon: Users
  },
  {
    title: '用量',
    url: '/manage/usage',
    icon: CircleGauge
  }
]

export default observer(() => {
  let location = useLocation()
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent className={'p-2'}>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === item.url}
                >
                  <NavLink to={item.url} end>
                    <item.icon />
                    {item.title}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <main className={'flex flex-col flex-1'}>
        <div className={'flex items-center justify-between h-10 px-2'}>
          <div>
            <SidebarTrigger />
          </div>
        </div>
        <div className={'overflow-y-auto h-0 flex-1 p-4'}>
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  )
})

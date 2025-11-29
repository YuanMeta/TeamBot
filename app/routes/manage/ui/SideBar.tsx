import { observer } from 'mobx-react-lite'

import {
  BotMessageSquare,
  Users,
  Wrench,
  Bot,
  EllipsisVertical,
  MonitorCog,
  Sun,
  Moon,
  LogOut,
  UserRound
} from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import {
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
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
import { AdminConfirmDialog } from '~/components/project/confirm-dialog'
import { useEffect, type ReactNode } from 'react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { Github } from '@lobehub/icons'
import { Theme, useTheme } from 'remix-themes'
import { useLocalState } from '~/hooks/localState'
import { trpc } from '~/.client/trpc'

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
  }
]

export const ManageSideBar = observer((props: { children: ReactNode }) => {
  let location = useLocation()
  let navigate = useNavigate()
  const [theme, setTheme, meta] = useTheme()
  const [state, setState] = useLocalState({
    userInfo: null as null | {
      name: string
      email: string
      role: string
    }
  })
  useEffect(() => {
    trpc.chat.getUserInfo.query().then((data) => {
      setState({ userInfo: (data as any) || null })
    })
  }, [])
  return (
    <SidebarProvider>
      <Sidebar variant={'sidebar'} collapsible={'icon'}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => {
                  navigate('/chat')
                }}
                className='data-[slot=sidebar-menu-button]:!p-1.5'
              >
                <Bot className='!size-5' />
                <span className='text-base font-semibold'>Team Bot</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
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
        <SidebarFooter className={'pb-3'}>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size='lg'
                    className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                  >
                    <Avatar className='h-8 w-8 rounded-lg grayscale'>
                      <AvatarFallback className='rounded-lg'>
                        <UserRound className={'size-4'} />
                      </AvatarFallback>
                    </Avatar>
                    <div className='grid flex-1 text-left text-sm leading-tight'>
                      <span className='truncate font-medium'>
                        {state.userInfo?.email || state.userInfo?.name}
                      </span>
                    </div>
                    <EllipsisVertical className={'ml-auto size-4'} />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className='w-48 rounded-lg'
                  side={'right'}
                  align='end'
                  sideOffset={4}
                >
                  <DropdownMenuGroup>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <MonitorCog />
                        主题
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          <DropdownMenuCheckboxItem
                            checked={
                              theme === 'light' && meta.definedBy === 'USER'
                            }
                            onClick={() => {
                              setTheme(Theme.LIGHT)
                            }}
                          >
                            <Sun />
                            明亮
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={
                              theme === 'dark' && meta.definedBy === 'USER'
                            }
                            onClick={() => {
                              setTheme(Theme.DARK)
                            }}
                          >
                            <Moon />
                            暗黑
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={!theme || meta.definedBy === 'SYSTEM'}
                            onClick={() => {
                              setTheme(null)
                            }}
                          >
                            <MonitorCog />
                            系统
                          </DropdownMenuCheckboxItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuItem
                      onClick={() => {
                        window.open('https://github.com/YuanMeta/TeamBot')
                      }}
                    >
                      <Github />
                      Git Hub
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      fetch('/api/logout', {
                        method: 'POST',
                        credentials: 'include'
                      }).then((res) => {
                        if (res.ok) {
                          navigate('/login')
                        }
                      })
                    }}
                  >
                    <LogOut />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <main className={'flex flex-col flex-1 max-h-screen'}>
          <div className={'flex items-center justify-between h-10 px-2'}>
            <div>
              <SidebarTrigger />
            </div>
          </div>
          {props.children}
        </main>
      </SidebarInset>
      <AdminConfirmDialog />
    </SidebarProvider>
  )
})

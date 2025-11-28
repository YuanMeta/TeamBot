import {
  EllipsisVertical,
  LogOut,
  MonitorCog,
  Moon,
  Sun,
  UserRound,
  UserStar
} from 'lucide-react'
import { useNavigate } from 'react-router'
import { Theme, useTheme } from 'remix-themes'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
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
import { useStore } from '../store/store'

export function NavUser({
  user
}: {
  user: {
    name: string
    email: string
  }
}) {
  const navigate = useNavigate()
  const [theme, setTheme, meta] = useTheme()
  const store = useStore()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className={'w-full px-2 justify-center flex py-2 border-t'}>
          <div className='w-full flex-1 px-2 flex items-center justify-between py-1 rounded-md dark:hover:bg-accent/40 duration-150 hover:bg-accent-foreground/5 cursor-pointer'>
            <div className={'flex items-center gap-2'}>
              <Avatar className='h-7 w-7 rounded-lg grayscale'>
                <AvatarFallback className='rounded-lg'>
                  <UserRound className={'size-4'} />
                </AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-medium'>{user.name}</span>
                {!!user.email && (
                  <span className='text-muted-foreground truncate text-xs'>
                    {user.email}
                  </span>
                )}
              </div>
            </div>

            <EllipsisVertical className={'size-4'} />
          </div>
        </div>
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
                  checked={theme === 'light' && meta.definedBy === 'USER'}
                  onClick={() => {
                    setTheme(Theme.LIGHT)
                  }}
                >
                  <Sun />
                  明亮
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={theme === 'dark' && meta.definedBy === 'USER'}
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
            disabled={store.state.userInfo?.role !== 'admin'}
            onClick={() => {
              navigate('/manage')
            }}
          >
            <UserStar />
            管理中心
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
  )
}

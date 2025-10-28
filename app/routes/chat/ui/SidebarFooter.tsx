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
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
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

export function NavUser({
  user
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const navigate = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className={'w-full px-2 justify-center flex py-2 border-t'}>
          <Button variant={'ghost'} className='w-full flex-1 px-3'>
            <Avatar className='h-7 w-7 rounded-lg grayscale'>
              <AvatarFallback className='rounded-lg'>
                <UserRound />
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
            <EllipsisVertical />
          </Button>
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
                <DropdownMenuCheckboxItem checked={true}>
                  <Sun />
                  明亮
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>
                  <Moon />
                  暗黑
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>
                  <MonitorCog />
                  系统
                </DropdownMenuCheckboxItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuItem disabled={true}>
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

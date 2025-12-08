import { observer } from 'mobx-react-lite'
import {
  Ellipsis,
  PanelLeftClose,
  PencilLine,
  Search,
  SquareArrowOutUpRight,
  SquarePen,
  Trash
} from 'lucide-react'
import { ChatStore, useStore } from '../store/store'
import { useNavigate, useParams } from 'react-router'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import { useLocalState } from '~/hooks/localState'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '~/components/ui/alert-dialog'
import { NavUser } from './SidebarFooter'
import { Skeleton } from '~/components/ui/skeleton'
import { useRef, useEffect } from 'react'
import { copyToClipboard } from '~/.client/copy'
import { toast } from 'sonner'

const Item = observer(
  ({
    item,
    active,
    onClick,
    onDelete
  }: {
    item: ChatStore['state']['chats'][number]
    active: boolean
    onClick: () => void
    onDelete: () => void
  }) => {
    const store = useStore()
    const [state, setState] = useLocalState({
      hovered: false,
      showMenu: false
    })
    return (
      <div
        className={`sidebar-item group justify-between pl-2.5 ${
          state.hovered || state.showMenu ? 'pr-1.5' : 'pr-2.5'
        } ${active ? 'active' : ''}`}
        key={item.id}
        onClick={onClick}
        onMouseEnter={() => {
          setState({ hovered: true })
        }}
        onMouseLeave={() => {
          setState({ hovered: false })
        }}
      >
        <span className={'truncate'}>{item.title || '新对话'}</span>
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) {
              setState({ showMenu: open })
            } else {
              setTimeout(() => {
                setState({ showMenu: false })
              }, 100)
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              size={'icon-sm'}
              variant={'ghost'}
              className={`ml-1 ${
                state.hovered || state.showMenu ? '' : 'hidden'
              }`}
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-32'
            align='start'
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <DropdownMenuItem
              onClick={() => {
                copyToClipboard({
                  text: `${location.origin}/publish/${item.id}`
                })
                toast.success('链接已复制到剪贴板')
              }}
            >
              <SquareArrowOutUpRight />
              <span>共享</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                store.renameChatTitle$.next(item)
              }}
            >
              <PencilLine />
              <span>重命名</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant={'destructive'} onClick={onDelete}>
              <Trash />
              <span>删除</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }
)
export const ChatSidebar = observer(() => {
  const store = useStore()
  const params = useParams()
  const navigate = useNavigate()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useLocalState({
    showDeleteDialog: false,
    selectedChatId: null as null | string,
    collapsed: false
  })

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      if (scrollHeight - scrollTop - clientHeight < 100) {
        if (!store.state.loadingChats && store.loadMoreChats) {
          store.loadChats()
        }
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [store])

  return (
    <div
      className={
        'h-full border-r border-border bg-sidebar duration-150 overflow-hidden'
      }
      style={{
        width: state.collapsed ? 52 : 260
      }}
    >
      <div className={'h-full flex flex-col w-[260px]'}>
        <div className={'pb-3'}>
          <div
            className={`pt-2 pb-3 flex items-center justify-between duration-150 pr-2`}
          >
            <div className={'flex items-center px-2 gap-1'}>
              <div
                className={'sidebar-action'}
                onClick={() => {
                  setState({ collapsed: !state.collapsed })
                }}
              >
                <img
                  src='/logo-128.png'
                  className='size-5 shadow-sm shadow-neutral-200 dark:shadow-none rounded-xs'
                />
              </div>
              <div className={`${state.collapsed ? 'hidden' : ''}`}>
                <span className={'text-sm font-medium'}>Team Bot</span>
              </div>
            </div>

            <div
              className={'sidebar-action'}
              onClick={() => {
                setState({ collapsed: !state.collapsed })
              }}
            >
              <PanelLeftClose className={'size-[18px] text-primary/70'} />
            </div>
          </div>
          <div className={'px-2'}>
            <div
              className={`sidebar-item ${
                state.collapsed ? 'w-9 px-2' : ''
              } duration-150`}
              onClick={() => {
                navigate('/chat')
              }}
            >
              <div className={'w-9 flex justify-center items-center'}>
                <SquarePen className={'size-[17px]'} />
              </div>
              <span className={`${state.collapsed ? 'hidden' : ''}`}>
                新聊天
              </span>
            </div>
            <div
              className={`sidebar-item ${state.collapsed ? 'w-9 px-2' : ''}`}
              onClick={() => {
                store.setState((state) => (state.openSearchModal = true))
              }}
            >
              <div className={'w-9 flex justify-center items-center'}>
                <Search className={'size-[17px]'} />
              </div>
              <span className={`${state.collapsed ? 'hidden' : ''}`}>
                搜索聊天
              </span>
            </div>
          </div>
        </div>
        <div
          ref={scrollContainerRef}
          className={`flex-1 h-0 pt-2 overflow-auto pb-5 duration-150 ${
            state.collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className={'text-primary/60 text-sm pl-4 mb-2'}>聊天</div>
          <div className={'px-1.5'}>
            {store.state.loadingChats && !store.state.chats.length && (
              <div className={'px-2 space-y-2'}>
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-1/2' />
                <Skeleton className='h-4 w-3/4' />
              </div>
            )}
            {store.state.chats.map((chat) => (
              <Item
                item={chat}
                key={chat.id}
                active={params.id === chat.id}
                onDelete={() => {
                  setState({
                    showDeleteDialog: true,
                    selectedChatId: chat.id
                  })
                }}
                onClick={() => {
                  navigate(`/chat/${chat.id}`)
                }}
              />
            ))}
            {!store.state.chats.length && !store.state.loadingChats && (
              <div className={'text-center text-primary/50 text-[13px] mt-5'}>
                暂无聊天记录
              </div>
            )}
          </div>
        </div>
        <NavUser collapsed={state.collapsed} />
      </div>
      <AlertDialog
        open={state.showDeleteDialog}
        onOpenChange={(open) => {
          setState({ showDeleteDialog: open })
        }}
      >
        <AlertDialogContent className={'w-96'}>
          <AlertDialogHeader>
            <AlertDialogTitle>删除聊天?</AlertDialogTitle>
            <AlertDialogDescription>该操作不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant={'destructive'}
              onClick={() => {
                store.deleteChat(state.selectedChatId!)
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
})

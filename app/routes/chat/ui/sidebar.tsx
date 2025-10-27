import { observer } from 'mobx-react-lite'
import { OpenAI } from '@lobehub/icons'
import {
  BookMarked,
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
    const [state, setState] = useLocalState({
      hovered: false,
      showMenu: false
    })
    return (
      <div
        className={`sidebar-item group justify-between pl-2.5 ${state.hovered || state.showMenu ? 'pr-1.5' : 'pr-2.5'} ${active ? 'active' : ''}`}
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
              className={`ml-1 ${state.hovered || state.showMenu ? '' : 'hidden'}`}
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
            <DropdownMenuItem>
              <SquareArrowOutUpRight />
              <span>共享</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
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
  const [state, setState] = useLocalState({
    showDeleteDialog: false,
    selectedChatId: null as null | string
  })
  return (
    <div className={'w-[260px] h-full border-r border-border bg-sidebar'}>
      <div className={'w-[260px] h-full flex flex-col'}>
        <div className={'pb-3'}>
          <div className={'pt-2 pb-3 flex items-center px-2 justify-between'}>
            <div className={'sidebar-action'}>
              <OpenAI size={22} />
            </div>
            <div className={'sidebar-action'}>
              <PanelLeftClose className={'size-[18px] text-primary/70'} />
            </div>
          </div>
          <div className={'px-2'}>
            <div
              className={'sidebar-item'}
              onClick={() => {
                navigate('/chat')
              }}
            >
              <div className={'w-9 flex justify-center items-center'}>
                <SquarePen className={'size-[18px]'} />
              </div>
              <span>新聊天</span>
            </div>
            <div className={'sidebar-item'}>
              <div className={'w-9 flex justify-center items-center'}>
                <Search className={'size-[18px]'} />
              </div>
              <span>搜索聊天</span>
            </div>
            <div className={'sidebar-item'}>
              <div className={'w-9 flex justify-center items-center'}>
                <BookMarked className={'size-[18px]'} />
              </div>
              <span>文档库</span>
            </div>
          </div>
        </div>
        <div className={'flex-1 h-0 py-2 overflow-auto'}>
          <div className={'text-primary/60 text-sm pl-4 mb-2'}>聊天</div>
          <div className={'px-1.5'}>
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
            {!store.state.chats.length && (
              <div className={'text-center text-primary/50 text-[13px] mt-5'}>
                暂无聊天记录
              </div>
            )}
          </div>
        </div>
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
            <AlertDialogDescription>
              删除聊天仍然会保留该聊天所使用的Tokens记录。
            </AlertDialogDescription>
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

import { observer } from 'mobx-react-lite'
import { OpenAI } from '@lobehub/icons'
import { BookMarked, PanelLeftClose, Search, SquarePen } from 'lucide-react'
import { useStore } from '../store/store'
import { Skeleton } from '~/components/ui/skeleton'
export const ChatSidebar = observer(() => {
  const store = useStore()
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
            <div className={'sidebar-item'}>
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
              <div className={`sidebar-item px-2.5`} key={chat.id}>
                <span className={'truncate'}>{chat.title || '新对话'}</span>
              </div>
            ))}
            {!store.state.chats.length && (
              <div className={'text-center text-primary/50 text-[13px] mt-5'}>
                暂无聊天记录
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

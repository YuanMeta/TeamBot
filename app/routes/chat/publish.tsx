import { redirect, useLoaderData, useNavigate } from 'react-router'
import type { Route } from './+types/publish'
import { parseRecord } from 'server/lib/table'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '~/components/ui/empty'
import { Button } from '~/components/ui/button'
import { ChevronLeft, FileSearch } from 'lucide-react'
import ChatItem from './ui/ChatItem'
import { useMemo } from 'react'
import { ChatStore, StoreContext } from './store/store'
import { SearchResult } from './ui/SearchResult'

export const loader = async (args: Route.LoaderArgs) => {
  const userId = args.context.userId
  if (!userId) {
    return redirect('/login')
  }
  const { params } = args
  const { id } = params
  const chat = await args.context
    .db('chats')
    .where({ id })
    .select('id', 'title', 'last_chat_time', 'user_id')
    .first()

  if (!chat) {
    return { chat: null, messages: [] }
  }
  const messages = await args.context
    .db('messages')
    .where({ chat_id: id })
    .select(
      'id',
      'role',
      'text',
      'created_at',
      'parts',
      'updated_at',
      'model',
      'user_id'
    )
    .orderBy('created_at', 'asc')
  return { chat, messages: messages.map((m) => parseRecord(m)) }
}

export default function () {
  const data = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const store = useMemo(() => new ChatStore(true), [])

  if (!data.chat) {
    return (
      <div
        className={'flex flex-col items-center justify-center h-screen pb-20'}
      >
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <FileSearch />
            </EmptyMedia>
            <EmptyTitle>未找到对话记录</EmptyTitle>
            <EmptyDescription>该对话可能已被删除。</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant={'outline'} onClick={() => navigate('/chat')}>
              <ChevronLeft />
              返回
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }
  return (
    <StoreContext value={store}>
      <div className={'flex h-screen'}>
        <div className={'flex flex-col h-full w-full'}>
          <header
            className={
              'h-13 border-b flex items-center justify-center px-3 truncate w-full'
            }
          >
            {data.chat?.title}
          </header>
          <div className={'flex-1 overflow-y-auto  px-3 pt-5 pb-20 w-full'}>
            <div className={`chat-list animate-show !max-w-[720px] mx-auto`}>
              {data.messages.map((m) => (
                <ChatItem key={m.id} msg={m as any} preview={true} />
              ))}
            </div>
          </div>
        </div>
        <SearchResult />
      </div>
    </StoreContext>
  )
}

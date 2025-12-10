import { observer } from 'mobx-react-lite'
import { useRef, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { trpc } from '~/.client/trpc'
import {
  SearchIcon,
  ChevronDownIcon,
  MessageSquareIcon,
  Bot,
  UserRound
} from 'lucide-react'
import { useNavigate } from 'react-router'
import dayjs from 'dayjs'
import { cn } from '~/lib/utils'
import { useLocalState } from '~/hooks/localState'
import { useStore } from '../store/store'

interface MessageItem {
  id: string
  text: string
  updatedAt: Date
  role: 'user' | 'assistant'
}

interface ChatItem {
  id: string
  title: string
  lastChatTime: Date
  messages: MessageItem[]
}

export const SearchModal = observer(() => {
  const store = useStore()
  const [state, setState] = useLocalState({
    query: '',
    searchResults: [] as ChatItem[],
    currentPage: 1,
    isLoading: false,
    hasMore: true,
    expandedChats: new Set<string>()
  })
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // 执行搜索
  const performSearch = useCallback(
    async (searchQuery: string, page: number, append: boolean = false) => {
      if (!searchQuery.trim()) {
        setState({
          searchResults: [],
          hasMore: false
        })
        return
      }

      setState({ isLoading: true })
      try {
        const results = await trpc.chat.searchChat.mutate({
          query: searchQuery,
          page
        })

        if (append) {
          setState((s) => {
            s.searchResults = [...s.searchResults, ...results]
          })
        } else {
          setState({ searchResults: results })
        }

        // 如果返回的结果少于10条，说明没有更多了
        setState({ hasMore: results.length === 10 })
      } catch (error) {
        console.error('搜索失败:', error)
      } finally {
        setState({ isLoading: false })
      }
    },
    []
  )

  // 处理搜索输入
  const handleSearchChange = (value: string) => {
    setState({
      query: value,
      currentPage: 1,
      expandedChats: new Set()
    })

    // 防抖搜索
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value, 1, false)
    }, 300)
  }

  // 滚动到底部加载更多
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const scrollTop = target.scrollTop
    const scrollHeight = target.scrollHeight
    const clientHeight = target.clientHeight

    // 当滚动到底部附近时加载更多
    if (
      scrollHeight - scrollTop - clientHeight < 100 &&
      !state.isLoading &&
      state.hasMore &&
      state.query.trim()
    ) {
      const nextPage = state.currentPage + 1
      setState({ currentPage: nextPage })
      performSearch(state.query, nextPage, true)
    }
  }, [])

  // 切换展开/收起消息列表
  const toggleExpand = (chatId: string) => {
    setState((s) => {
      const newSet = new Set(s.expandedChats)
      if (newSet.has(chatId)) {
        newSet.delete(chatId)
      } else {
        newSet.add(chatId)
      }
      s.expandedChats = newSet
    })
  }

  const navigateToChat = (chatId: string) => {
    navigate(`/chat/${chatId}`)
    store.setState((state) => (state.openSearchModal = false))
    setState({
      expandedChats: new Set()
    })
  }

  // 高亮搜索关键词
  const highlightText = (text: string, keyword: string) => {
    if (!keyword.trim() || !text) return text

    const parts = text.split(new RegExp(`(${keyword})`, 'gi'))
    return parts.map((part, index) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <span
          key={index}
          className='bg-yellow-200 dark:bg-yellow-200/50 rounded-xs'
        >
          {part}
        </span>
      ) : (
        part
      )
    )
  }

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setState({
        query: '',
        searchResults: [],
        currentPage: 1,
        expandedChats: new Set(),
        hasMore: true
      })
    }
  }, [store.state.openSearchModal])

  return (
    <Dialog
      open={store.state.openSearchModal}
      onOpenChange={(open) => {
        store.setState((state) => (state.openSearchModal = open))
      }}
    >
      <DialogContent className='max-w-3xl max-h-[80vh] flex flex-col p-0'>
        <DialogHeader className='pb-3'>
          <DialogTitle>搜索对话</DialogTitle>
        </DialogHeader>

        <div className='px-5 pb-3'>
          <div className='relative'>
            <SearchIcon className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
            <Input
              placeholder='搜索对话标题或消息内容...'
              value={state.query}
              onChange={(e) => handleSearchChange(e.target.value)}
              className='pl-10'
              autoFocus
            />
          </div>
        </div>

        <div className='flex-1 overflow-hidden px-5 pb-5 min-h-[300px]'>
          <div
            ref={scrollAreaRef}
            onScroll={handleScroll}
            className='space-y-3 h-full overflow-y-auto'
            style={{ maxHeight: 'calc(80vh - 140px)' }}
          >
            {state.searchResults.length === 0 &&
              !state.isLoading &&
              state.query.trim() && (
                <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
                  <MessageSquareIcon className='size-12 mb-3 opacity-20' />
                  <p>未找到相关对话</p>
                </div>
              )}

            {state.searchResults.length === 0 && !state.query.trim() && (
              <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
                <SearchIcon className='size-12 mb-3 opacity-20' />
                <p>输入关键词开始搜索</p>
              </div>
            )}

            {state.searchResults.map((chat) => {
              const isExpanded = state.expandedChats.has(chat.id)
              const displayMessages = isExpanded
                ? chat.messages
                : chat.messages.slice(0, 3)
              const hasMoreMessages = chat.messages.length > 3

              return (
                <div
                  key={chat.id}
                  className='border rounded-lg p-2 duration-150 hover:border-primary/30 cursor-pointer'
                  onClick={() => navigateToChat(chat.id)}
                >
                  <div className='flex items-start justify-between p-2 rounded-md '>
                    <div className='flex-1'>
                      <h3 className='font-medium text-sm mb-1'>
                        {chat.title
                          ? highlightText(chat.title, state.query)
                          : '无标题对话'}
                      </h3>
                      <p className='text-xs text-muted-foreground'>
                        {dayjs(chat.lastChatTime).format('YYYY-MM-DD HH:mm:ss')}
                      </p>
                    </div>
                  </div>

                  {displayMessages.length > 0 && (
                    <div className='space-y-1 border-t pt-2 mt-2'>
                      {displayMessages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            'px-2 py-1 rounded text-xs cursor-pointer duration-100'
                          )}
                        >
                          <div className='flex items-center gap-2 mb-1'>
                            <span className='font-medium text-muted-foreground'>
                              {message.role === 'user' ? (
                                <UserRound className={'size-3.5'} />
                              ) : (
                                <Bot className={'size-3.5'} />
                              )}
                            </span>
                            <span className='text-[10px] text-muted-foreground'>
                              {dayjs(message.updatedAt).format(
                                'YYYY-MM-DD HH:mm'
                              )}
                            </span>
                          </div>
                          <div className='line-clamp-2'>
                            {message.text
                              ? highlightText(message.text, state.query)
                              : '(无内容)'}
                          </div>
                        </div>
                      ))}

                      {hasMoreMessages && (
                        <Button
                          variant='ghost'
                          size='sm'
                          className='w-full'
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleExpand(chat.id)
                          }}
                        >
                          <ChevronDownIcon
                            className={cn(
                              'size-4 transition-transform',
                              isExpanded && 'rotate-180'
                            )}
                          />
                          {isExpanded
                            ? '收起'
                            : `显示更多 (${chat.messages.length - 3} 条)`}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {state.isLoading && (
              <div className='flex items-center justify-center py-4'>
                <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary'></div>
              </div>
            )}

            {!state.hasMore &&
              state.searchResults.length > 0 &&
              !state.isLoading && (
                <div className='text-center py-4 text-xs text-muted-foreground'>
                  已加载全部结果
                </div>
              )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import ChatItem from './ChatItem'
import { useStore } from '../store/store'
import { useLocalState, useSubject } from '~/hooks/localState'

export const AiMessageList = observer(() => {
  const store = useStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const scrollTimer = useRef(0)
  const [state, setState] = useLocalState({
    atBottom: false,
    isScrolling: false,
    followOutput: false,
    visible: true,
    showScrollToBottom: true
  })

  const scrollToChat = useCallback(
    (index: number, behavior: 'auto' | 'smooth' = 'auto') => {
      if (scrollRef.current) {
        const target = listRef.current!.children?.[index - 1]
        if (target) {
          target.scrollIntoView({ behavior, block: 'start' })
        }
      }
    },
    []
  )
  const scrollToBottom = useCallback(
    (behavior: 'auto' | 'smooth' | 'instant' = 'auto') => {
      if (scrollRef.current) {
        const last = listRef.current?.children?.[
          listRef.current?.children.length - 1
        ] as HTMLElement
        last.scrollIntoView({ behavior, block: 'end' })
      }
    },
    []
  )
  const scroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    clearTimeout(scrollTimer.current)
    scrollTimer.current = window.setTimeout(() => {
      setState({
        showScrollToBottom:
          listRef.current!.scrollHeight > window.innerHeight - 200 &&
          scrollRef.current!.scrollTop + scrollRef.current!.clientHeight <
            listRef.current!.scrollHeight - 300
      })
      // 检测是否滚动到顶部，加载更多消息
      if (
        scrollRef.current &&
        scrollRef.current.scrollTop < 100 &&
        !store.state.loadingMessages &&
        store.loadMoreMessages &&
        store.state.selectedChat?.id
      ) {
        console.log('load')

        // const previousScrollHeight = listRef.current!.scrollHeight
        store.loadMessages(store.state.selectedChat.id).then(() => {
          // 恢复滚动位置，避免跳动
          // requestAnimationFrame(() => {
          //   if (scrollRef.current && listRef.current) {
          //     const newScrollHeight = listRef.current.scrollHeight
          //     // const scrollDiff = newScrollHeight - previousScrollHeight
          //     // scrollRef.current.scrollTop = scrollDiff
          //   }
          // })
        })
      }
    }, 30)
  }, [])

  useSubject(store.scrollToActiveMessage$, () => {
    setTimeout(() => {
      if (store.state.messages?.length) {
        scrollToChat(store.state.messages.length - 1, 'smooth')
      }
    }, 30)
  })
  useSubject(store.scrollToBottom$, () => {
    scrollToBottom('instant')
  })
  useSubject(store.transList$, () => {
    setState({ visible: false, showScrollToBottom: false })
    scrollRef.current?.scrollTo({
      top: 0,
      behavior: 'instant'
    })
    setTimeout(() => {
      setState({
        visible: true
      })
    }, 50)
  })
  useEffect(() => {
    setState({
      showScrollToBottom: false
    })
  }, [store.state.selectedChat?.id])
  return (
    <div className={'relative h-full'}>
      <div
        className={`overflow-y-auto h-full pb-10 relative px-10`}
        ref={scrollRef}
        onScroll={scroll}
      >
        <div
          ref={listRef}
          className={`chat-list ${state.visible ? 'animate-show' : 'opacity-0'} ${store.state.chatPending[store.state.selectedChat?.id!]?.pending ? 'pending' : ''}`}
        >
          {store.state.messages.map((m) => (
            <ChatItem key={m.id} msg={m} />
          ))}
        </div>
      </div>
      {!!store.state.messages.length && (
        <div
          onClick={() => {
            scrollToBottom('smooth')
          }}
          className={`absolute left-1/2 -translate-x-1/2 p-0.5 bg-background z-10 bottom-4 rounded-full border opacity-0 dark:border-white/10 border-black/20 ${state.showScrollToBottom ? 'animate-show cursor-pointer' : 'pointer-events-none'}`}
        >
          <ChevronDown
            size={16}
            className={'dark:stroke-white/60 stroke-black/60'}
          />
        </div>
      )}
    </div>
  )
})

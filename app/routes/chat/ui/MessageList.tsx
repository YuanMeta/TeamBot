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
  const scrollToBottom = useCallback((behavior: 'auto' | 'smooth' = 'auto') => {
    if (scrollRef.current) {
      const last = listRef.current?.children?.[
        listRef.current?.children.length - 1
      ] as HTMLElement
      last.scrollIntoView({ behavior, block: 'end' })
    }
  }, [])
  const scroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    clearTimeout(scrollTimer.current)
    scrollTimer.current = window.setTimeout(() => {
      setState({
        showScrollToBottom:
          listRef.current!.scrollHeight > window.innerHeight - 200 &&
          scrollRef.current!.scrollTop + scrollRef.current!.clientHeight <
            listRef.current!.scrollHeight - 300
      })
    }, 100)
  }, [])

  useSubject(store.scrollToActiveMessage$, () => {
    setTimeout(() => {
      if (store.state.messages?.length) {
        scrollToChat(store.state.messages.length - 1, 'smooth')
      }
    }, 30)
  })
  useSubject(store.scrollToTop$, () => {
    scrollRef.current?.scrollTo({
      top: 0,
      behavior: 'instant'
    })
  })
  useSubject(store.transList$, () => {
    setState({ visible: false, showScrollToBottom: false })
    scrollRef.current?.scrollTo({
      top: 0,
      behavior: 'instant'
    })
    setTimeout(() => {
      setState({
        visible: true,
        showScrollToBottom:
          listRef.current!.scrollHeight > window.innerHeight - 200
      })
    }, 50)
  })
  return (
    <div className={'relative h-full'}>
      <div
        className={`overflow-y-auto h-full pb-10 relative px-4`}
        ref={scrollRef}
        onScroll={scroll}
      >
        <div
          ref={listRef}
          className={`chat-list ${state.visible ? 'animate-show' : 'opacity-0'} ${store.state.pending ? 'pending' : ''}`}
        >
          {store.state.messages.map((m) => (
            <ChatItem key={m.tid || m.id} msg={m} />
          ))}
        </div>
      </div>
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
    </div>
  )
})

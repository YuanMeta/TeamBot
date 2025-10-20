import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useGetSetState } from 'react-use'
// import ChatItem from './ChatItem'
import { observer } from 'mobx-react-lite'
import ChatItem from '../ChatItem'
import { ChatEmpty } from '../Empty'
import { ChevronDown } from 'lucide-react'
import { useStore } from '../../store/store'
import { useSubject } from '~/hooks/localState'

export const MessageList = observer(() => {
  const store = useStore()
  const [state, setState] = useGetSetState({
    visible: true,
    atBottom: false,
    isScrolling: false,
    followOutput: false,
    showScrollToBottom: true
  })
  useLayoutEffect(() => {
    setState({ visible: false })
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: 0,
        behavior: 'instant'
      })
    }, 16)
    setTimeout(() => {
      setState({
        visible: true
      })
      setTimeout(() => {
        setTimeout(() => {
          const list = getList()
          setState({
            showScrollToBottom:
              list!.scrollHeight > scrollRef.current!.clientHeight + 500
          })
        }, 50)
      }, 60)
    }, 60)
  }, [store.state.selectedChat])
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollTimer = useRef(0)
  const getList = useCallback(() => {
    return scrollRef?.current?.querySelector('.message-list') as HTMLDivElement
  }, [])
  const scrollToChat = useCallback(
    (index: number, behavior: 'auto' | 'smooth' = 'auto') => {
      if (scrollRef.current) {
        const list = getList()
        const target = list?.children[index - 1]
        if (target) {
          target.scrollIntoView({ behavior, block: 'start' })
        }
      }
    },
    [store.state.messages?.length]
  )
  const scrollToBottom = useCallback(
    (behavior: 'auto' | 'smooth' = 'auto') => {
      if (scrollRef.current) {
        const list = getList()
        const last = list?.children[list.children.length - 1]
        if (last) {
          last.scrollIntoView({ behavior, block: 'end' })
        }
      }
    },
    [store.state.messages?.length]
  )
  const scroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    clearTimeout(scrollTimer.current)
    scrollTimer.current = window.setTimeout(() => {
      const list = getList()
      let top = scrollRef.current!.scrollTop
      setState({
        showScrollToBottom:
          list!.scrollHeight > scrollRef.current!.clientHeight + 300 &&
          top + scrollRef.current!.clientHeight < list!.scrollHeight - 300
      })
    }, 60)
  }, [])

  useSubject(store.scrollToActiveMessage$, () => {
    setTimeout(() => {
      if (store.state.messages?.length) {
        scrollToChat(store.state.messages.length - 1, 'smooth')
      }
    }, 30)
  })
  return (
    <div className={'relative h-full text-[15px] leading-5'}>
      {!store.state.messages.length && <ChatEmpty />}
      <div
        className={'relative overflow-y-auto h-full px-4'}
        ref={scrollRef}
        onScroll={scroll}
      >
        <div className={`pt-4 pb-10 max-w-[760px] w-full mx-auto`}>
          <div
            className={`message-list ${state().visible ? 'animate-show' : ''} ${store.state?.pending ? 'pending' : ''}`}
          >
            {store.state.messages?.map((m) => (
              <ChatItem key={m.id} msg={m} />
            ))}
          </div>
        </div>
      </div>
      {!!store.state.selectedChat && (
        <div
          onClick={() => {
            scrollToBottom('smooth')
          }}
          className={`absolute left-1/2 shadow shadow-black/20 -translate-x-1/2 p-0.5 bg-white z-10 bottom-3 rounded-full duration-100 ${state().showScrollToBottom ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
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

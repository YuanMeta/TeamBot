import { observer } from 'mobx-react-lite'
import { ChatSidebar } from './ui/Sidebar'
import { ChatStore, StoreContext } from './store/store'
import { useLayoutEffect, useMemo } from 'react'
import { ChatInput } from './ui/ChatInput/ChatInput'
import { Header } from './ui/Header'
import { AiMessageList } from './ui/MessageList'
import { redirect, useNavigate, useParams } from 'react-router'
import { useLocalState, useSubject } from '~/hooks/localState'
import { SearchResult } from './ui/SearchResult'
import type { Route } from './+types/chat'

export const loader = (args: Route.LoaderArgs) => {
  const userId = args.context.userId
  if (!userId) {
    return redirect('/login')
  }
  return null
}
export default observer(() => {
  const [state, setState] = useLocalState({
    moveY: 0
  })
  let params = useParams()
  const store = useMemo(() => new ChatStore(), [])
  const navigate = useNavigate()
  useLayoutEffect(() => {
    if (store.state.ready) {
      store.selectChat(params.id as string)
    }
    setState({
      moveY: 0
    })
  }, [params.id, store.state.ready])
  useSubject(
    store.navigate$,
    (path) => {
      navigate(path)
    },
    [navigate]
  )
  useSubject(store.moveChatInput$, () => {
    if (store.state.selectedChat) return
    setState({
      moveY: window.innerHeight / 2
    })
  })
  if (!store.state.ready) return null
  return (
    <StoreContext value={store}>
      <div className={'flex h-screen overflow-hidden'}>
        <ChatSidebar />
        <div className={'flex flex-col flex-1 relative'}>
          <Header />
          <div className={`h-0 flex-1`}>
            <AiMessageList />
          </div>
          <div
            className={`${params.id ? '' : `absolute top-1/2 -mt-[128px] w-full ${state.moveY !== 0 ? 'duration-150' : ''}`}`}
            style={{
              transform: `translateY(${state.moveY}px)`
            }}
          >
            {!params.id && !store.state.messages.length && (
              <div className={'text-center text-xl font-medium mb-6'}>
                今天有什么可以帮到你？
              </div>
            )}

            <ChatInput />
            {(!!store.state.messages.length || !!params.id) && (
              <div
                className={
                  'h-8 flex items-center justify-center text-xs text-primary/50'
                }
              >
                AI 也可能会犯错。请核查重要信息。
              </div>
            )}
          </div>
        </div>
        <SearchResult />
      </div>
    </StoreContext>
  )
})

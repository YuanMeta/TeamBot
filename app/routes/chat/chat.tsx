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
import { ChatRename } from './ui/Rename'
import { SearchModal } from './ui/SearchModal'
import { PreviewImage } from '~/components/project/preview'
import {
  ErrorBoundary,
  ErrorFallback
} from '~/components/project/ErrorBoundary'
import { ErrorDialog } from './ui/ErrorDialog'

export const loader = (args: Route.LoaderArgs) => {
  const userId = args.context.userId
  if (!userId) {
    return redirect('/login')
  }
  return null
}
export default observer(() => {
  const [state, setState] = useLocalState({
    duration: false,
    moveBottom: false
  })
  let params = useParams()
  const store = useMemo(() => new ChatStore(), [])
  const navigate = useNavigate()
  useLayoutEffect(() => {
    if (store.state.ready) {
      store.selectChat(params.id as string)
    }
    if (!params.id) {
      setState({
        moveBottom: false,
        duration: false
      })
    } else {
      setState({
        moveBottom: true
      })
    }
  }, [params.id, store.state.ready])
  useSubject(
    store.navigate$,
    (path) => {
      navigate(path)
    },
    [navigate]
  )
  useSubject(store.moveChatInput$, (bottom: boolean) => {
    if (bottom) {
      setState({
        duration: true,
        moveBottom: true
      })
    } else {
      setState({
        duration: false,
        moveBottom: false
      })
    }
    setTimeout(() => {
      setState({ duration: false })
    }, 200)
  })
  if (!store.state.ready) return null
  return (
    <StoreContext value={store}>
      <ErrorBoundary fallback={(e) => <ErrorFallback error={e} />}>
        <div className={'flex h-screen overflow-hidden'}>
          <ChatSidebar />
          <div className={'flex flex-col flex-1 relative'}>
            <Header />
            <ErrorBoundary fallback={(e) => <ErrorFallback error={e} />}>
              <div className={`h-0 flex-1`}>
                <AiMessageList />
              </div>
            </ErrorBoundary>
            <div
              className={`${state.duration ? 'duration-200' : ''}`}
              style={{
                transform: state.moveBottom
                  ? 'translateY(0px)'
                  : `translateY(calc((-100vh + 52px) / 2))`
              }}
            >
              {!state.moveBottom && (
                <div className={'text-center text-xl font-medium mb-6'}>
                  今天有什么可以帮到你？
                </div>
              )}

              <ChatInput />
              {state.moveBottom && (
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
        <ChatRename />
        <SearchModal />
        <PreviewImage />
        <ErrorDialog />
      </ErrorBoundary>
    </StoreContext>
  )
})

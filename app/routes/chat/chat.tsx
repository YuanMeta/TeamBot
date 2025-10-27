import { observer } from 'mobx-react-lite'
import { ChatSidebar } from './ui/Sidebar'
import { ChatStore, StoreContext } from './store/store'
import { useEffect, useMemo } from 'react'
import { ChatInput } from './ui/ChatInput/ChatInput'
import { Header } from './ui/Header'
import { AiMessageList } from './ui/MessageList'
import { useNavigate, useParams } from 'react-router'
import { useSubject } from '~/hooks/localState'
import { SearchResult } from './ui/SearchResult'

export default observer(() => {
  let params = useParams()
  const store = useMemo(() => new ChatStore(params.id as string), [])
  const navigate = useNavigate()
  useEffect(() => {
    if (store.state.ready) {
      store.selectChat(params.id as string)
    }
  }, [params.id, store.state.ready])
  useSubject(
    store.navigate$,
    (path) => {
      navigate(path)
    },
    [navigate]
  )
  return (
    <StoreContext value={store}>
      <div className={'flex h-screen'}>
        <ChatSidebar />
        <div className={'flex flex-col flex-1'}>
          <Header />
          <div className={'flex-1 h-0'}>
            <AiMessageList />
          </div>
          <ChatInput />
          <div
            className={
              'h-8 flex items-center justify-center text-xs text-primary/50'
            }
          >
            AI 也可能会犯错。请核查重要信息。
          </div>
        </div>
        <SearchResult />
      </div>
    </StoreContext>
  )
})

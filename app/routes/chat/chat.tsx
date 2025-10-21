import { observer } from 'mobx-react-lite'
import { ChatSidebar } from './ui/Sidebar'
import { ChatStore, StoreContext } from './store/store'
import { useEffect, useMemo } from 'react'
import { ChatInput } from './ui/ChatInput/ChatInput'
import { Header } from './ui/Header'
import { AiMessageList } from './ui/MessageList'

export default observer(() => {
  const store = useMemo(() => new ChatStore(), [])
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
        </div>
      </div>
    </StoreContext>
  )
})

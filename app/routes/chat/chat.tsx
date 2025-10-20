import { observer } from 'mobx-react-lite'
import { ChatSidebar } from './ui/Sidebar'
import { ChatStore, StoreContext } from './store/store'
import { useEffect, useMemo } from 'react'
import { ChatInput } from './ui/ChatInput/ChatInput'

export default observer(() => {
  const store = useMemo(() => new ChatStore(), [])
  return (
    <StoreContext value={store}>
      <div className={'flex h-screen'}>
        <ChatSidebar />
        <div className={'flex flex-col flex-1'}>
          <ChatInput />
        </div>
      </div>
    </StoreContext>
  )
})

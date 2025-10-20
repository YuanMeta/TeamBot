import { observer } from 'mobx-react-lite'
import { ChatSidebar } from './ui/sidebar'
import { ChatStore, StoreContext } from './store/store'
import { useEffect, useMemo } from 'react'

export default observer(() => {
  const store = useMemo(() => new ChatStore(), [])
  return (
    <StoreContext value={store}>
      <div className={'flex h-screen'}>
        <ChatSidebar />
      </div>
    </StoreContext>
  )
})

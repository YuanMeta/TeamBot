import { createContext, useContext } from 'react'
import { StructStore } from './struct'
import { trpc } from '~/.client/trpc'
import { isClient } from '~/lib/utils'

const state = {
  chats: [] as { id: string; title: string; lastChatTime: Date }[]
}
export class ChatStore extends StructStore<typeof state> {
  constructor() {
    super(state)
    if (isClient) {
      this.loadChats()
    }
  }
  loadChats() {
    trpc.chat.getChats
      .query({
        offset: this.state.chats.length
      })
      .then((res) => {
        console.log('res', res)

        this.setState((state) => {
          state.chats = [...state.chats, ...res]
        })
      })
  }
}

export const StoreContext = createContext<ChatStore>({} as any)

export const useStore = () => {
  return useContext(StoreContext)
}

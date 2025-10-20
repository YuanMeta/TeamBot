import { createContext, useContext } from 'react'
import { StructStore } from './struct'
import { trpc } from '~/.client/trpc'
import { isClient } from '~/lib/utils'
import type { Message } from '@prisma/client'
import { Subject } from 'rxjs'

const state = {
  chats: [] as { id: string; title: string; lastChatTime: Date }[],
  messages: [] as Message[],
  pending: false,
  selectedChat: null as null | {
    id: string
    title: string
    lastChatTime: Date
  }
}
export class ChatStore extends StructStore<typeof state> {
  scrollToActiveMessage$ = new Subject<void>()
  abortController: AbortController | null = null
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
        this.setState((state) => {
          state.chats = [...state.chats, ...res]
        })
      })
  }
  selectChat(chat: { id: string; title: string; lastChatTime: Date }) {
    this.setState((state) => {
      state.selectedChat = chat
    })
  }
}

export const StoreContext = createContext<ChatStore>({} as any)

export const useStore = () => {
  return useContext(StoreContext)
}

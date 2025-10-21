import { createContext, useContext } from 'react'
import { StructStore } from './struct'
import { trpc } from '~/.client/trpc'
import { isClient } from '~/lib/utils'
import type { Assistant, Message, MessageFile } from '@prisma/client'
import { Subject } from 'rxjs'

export interface MessageData extends Message {
  tid?: string
  files?: MessageFile[]
}
const state = {
  chats: [] as {
    id: string
    title: string
    lastChatTime: Date
    assistantId: string | null
    model: string | null
  }[],
  messages: [] as MessageData[],
  pending: false,
  assistants: [] as Assistant[],
  selectedChat: null as null | {
    id: string
    title: string
    lastChatTime: Date
    assistantId: string | null
    model: string | null
  },
  get assistant(): Assistant | null {
    if (this.selectedChat) {
      const as = this.assistants.find(
        (a) => a.id === this.selectedChat?.assistantId
      )
      if (as) {
        return as
      }
    }
    const model = localStorage.getItem('last_assistant_model')
    if (model) {
      const [assistantId] = model.split(':')
      const as = this.assistants.find((a) => a.id === assistantId)
      if (as) {
        return as
      }
    }
    return this.assistants[0]
  },
  get model() {
    const as = this.assistant
    const models = as?.models as string[]
    if (this.selectedChat) {
      if (models.includes(this.selectedChat.model!)) {
        return this.selectedChat.model
      }
    }
    const model = localStorage.getItem('last_assistant_model')
    if (model) {
      const [assistantId, modelName] = model.split(':')
      if (as?.id === assistantId && models?.includes(modelName)) {
        return modelName
      }
    }
    return models?.[0]
  }
}
export class ChatStore extends StructStore<typeof state> {
  scrollToActiveMessage$ = new Subject<void>()
  scrollToTop$ = new Subject<void>()
  abortController: AbortController | null = null
  constructor() {
    super(state)
    if (isClient) {
      this.loadAssistants()
      this.loadChats()
    }
  }
  loadAssistants() {
    trpc.chat.getAssistants.query().then((res) => {
      this.setState((state) => {
        state.assistants = res as unknown as Assistant[]
      })
    })
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
  selectChat(chat: typeof this.state.selectedChat) {
    this.setState((state) => {
      state.selectedChat = chat
    })
  }
}

export const StoreContext = createContext<ChatStore>({} as any)

export const useStore = () => {
  return useContext(StoreContext)
}

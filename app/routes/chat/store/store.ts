import { createContext, useContext } from 'react'
import { StructStore } from './struct'
import { trpc } from '~/.client/trpc'
import { isClient } from '~/lib/utils'
import type { Assistant, MessageFile } from '@prisma/client'
import { Subject } from 'rxjs'
import { ChatClient } from './client'

export interface MessageData {
  id?: string
  tid?: string
  chatId: string
  content: string
  role: 'user' | 'assistant' | 'system'
  model?: string
  reasoning?: string | null
  terminated?: boolean
  reasoningDuration?: number | null
  context?: Record<string, any> | null
  height?: number | null
  usage?: Record<string, any> | null
  error?: string | null
  tools?: Record<string, any> | null
  files?: MessageFile[]
  updatedAt: Date
}

const state = {
  chats: [] as {
    id: string
    title: string
    lastChatTime: Date
    assistantId: string | null
    model: string | null
    messages?: MessageData[]
  }[],
  messages: [] as MessageData[],
  pending: false,
  ready: false,
  assistants: [] as Assistant[],
  assistantMap: {} as Record<string, Assistant>,
  cacheModel: null as string | null,
  selectedChat: null as null | {
    id: string
    title: string
    lastChatTime: Date
    assistantId: string | null
    model: string | null
    messages?: MessageData[]
  },
  get assistant(): Assistant | null {
    if (this.selectedChat) {
      const as = this.assistantMap[this.selectedChat?.assistantId!]
      if (as) {
        return as
      }
    }
    // const model = localStorage.getItem('last_assistant_model')
    if (this.cacheModel) {
      const [assistantId] = this.cacheModel.split(':')
      const as = this.assistantMap[assistantId]
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
    // const model = localStorage.getItem('last_assistant_model')
    if (this.cacheModel) {
      const [assistantId, modelName] = this.cacheModel.split(':')
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
  transList$ = new Subject<void>()
  abortController: AbortController | null = null
  client = new ChatClient(this)
  constructor() {
    super(state)
    if (isClient) {
      this.init()
    }
  }
  async init() {
    this.state.cacheModel = localStorage.getItem('last_assistant_model')
    await this.loadAssistants()
    await this.loadChats()
    this.setState((state) => (state.ready = true))
  }
  async loadAssistants() {
    this.state.assistantMap = {}
    await trpc.chat.getAssistants.query().then((res) => {
      res.forEach((a) => {
        this.state.assistantMap[a.id] = a as unknown as Assistant
      })
      this.setState((state) => {
        state.assistants = res as unknown as Assistant[]
      })
    })
  }
  async loadChats() {
    await trpc.chat.getChats
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
      if (chat?.messages) {
        this.transList$.next()
        state.messages = chat.messages
      }
    })
    if (chat && !chat.messages) {
      trpc.chat.getChatMessage
        .query({
          chatId: chat.id
        })
        .then((res) => {
          this.transList$.next()
          this.setState((state) => {
            state.messages = res as unknown as MessageData[]
          })
        })
    }
  }
  async selectModel(assistantId: string, model: string) {
    if (this.state.selectedChat) {
      this.setState((state) => {
        state.selectedChat!.assistantId = assistantId
        state.selectedChat!.model = model
      })
      trpc.chat.updateChat.mutate({
        id: this.state.selectedChat.id,
        data: {
          model,
          assistantId
        }
      })
    }
    this.setState((state) => {
      state.cacheModel = `${assistantId}:${model}`
      localStorage.setItem('last_assistant_model', state.cacheModel)
    })
  }
  async chat(data: { text: string }) {
    this.setState((state) => (state.pending = true))
    try {
      await this.client.complete(data)
    } catch (e) {
      console.log('err', e)
    } finally {
      this.setState((state) => (state.pending = false))
    }
  }
  async stop() {
    if (this.state.selectedChat && this.state.pending) {
      this.client.abortController?.abort()
      this.client.abortController = null
      this.setState((state) => {
        state.pending = false
        const aiMsg = state.messages[state.messages.length - 1]
        if (aiMsg) {
          aiMsg.terminated = true
          trpc.chat.updateMessage.mutate({
            id: aiMsg.id!,
            data: {
              terminated: true
            }
          })
        }
      })
    }
  }
}

export const StoreContext = createContext<ChatStore>({} as any)

export const useStore = () => {
  return useContext(StoreContext)
}

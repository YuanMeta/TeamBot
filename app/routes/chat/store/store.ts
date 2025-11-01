import { createContext, useContext } from 'react'
import { StructStore } from './struct'
import { trpc } from '~/.client/trpc'
import { isClient } from '~/lib/utils'
import type { Assistant, MessageFile } from '@prisma/client'
import { Subject } from 'rxjs'
import { ChatClient } from './client'
import type { MessagePart, SearchResult } from 'types'
import { observable } from 'mobx'

export interface MessageData {
  id?: string
  tid?: string
  chatId: string
  role: 'user' | 'assistant' | 'system'
  model?: string
  terminated?: boolean
  parts?: MessagePart[] | null
  reasoningDuration?: number | null
  context?: Record<string, any> | null
  error?: string | null
  files?: MessageFile[]
  updatedAt: Date
}

const state = {
  chats: [] as {
    id: string
    title: string
    last_chat_time: Date
    assistant_id: string | null
    model: string | null
    messages?: MessageData[]
  }[],
  chatPending: {} as Record<
    string,
    {
      pending: boolean
      abortController?: AbortController
    }
  >,
  messages: [] as MessageData[],
  ready: false,
  userInfo: null as null | {
    name: string | null
    email: string | null
    role: string | null
  },
  loadingChats: false,
  assistants: [] as Assistant[],
  assistantMap: {} as Record<string, Assistant>,
  cacheModel: null as string | null,
  selectSearchResult: null as null | SearchResult[],
  selectedChat: null as null | {
    id: string
    title: string
    lastChatTime: Date
    assistantId: string | null
    model: string | null
    messages?: MessageData[]
  },
  get pending() {
    return this.chatPending[this.selectedChat?.id!]?.pending || false
  },
  get assistant(): Assistant | null {
    if (this.selectedChat) {
      const as = this.assistantMap[this.selectedChat?.assistantId!]
      if (as) {
        return as
      }
    }
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
  chatsMap = new Map<string, (typeof this.state.chats)[number]>()
  scrollToTop$ = new Subject<void>()
  transList$ = new Subject<void>()
  navigate$ = new Subject<string>()
  moveChatInput$ = new Subject<void>()
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
    await trpc.chat.getUserInfo.query().then((res) => {
      this.setState((state) => (state.userInfo = res || null))
    })
    this.setState((state) => (state.ready = true))
    await this.loadChats()
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
    this.setState((state) => (state.loadingChats = true))
    await trpc.chat.getChats
      .query({
        offset: this.state.chats.length
      })
      .then((res) => {
        this.setState((state) => {
          const addChats = res.map((r) => observable(r))
          state.chats.push(...(addChats as any))
          addChats.forEach((c: any) => this.chatsMap.set(c.id, c))
        })
      })
      .finally(() => {
        this.setState((state) => (state.loadingChats = false))
      })
  }
  async selectChat(id?: string) {
    if (this.state.selectedChat?.id === id) return
    if (!id) {
      this.setState((state) => {
        state.selectedChat = null
        state.messages = []
      })
      return
    }
    let chat = this.chatsMap.get(id)
    if (!chat) {
      const res = await trpc.chat.getChat.query({ id })
      if (!res) return
      chat = observable(res as unknown as any)
      this.chatsMap.set(
        id,
        chat as unknown as (typeof this.state.chats)[number]
      )
    }
    if (!chat?.messages?.length) {
      this.setState((state) => {
        state.selectedChat = chat as unknown as typeof this.state.selectedChat
      })
      const messages = await trpc.chat.getMessages.query({
        chatId: chat!.id
      })
      this.transList$.next()
      this.setState((state) => {
        state.messages = messages as unknown as MessageData[]
        chat!.messages = state.messages
      })
    } else {
      this.setState((state) => {
        state.selectedChat = chat as any
        this.transList$.next()
        state.messages = chat.messages as unknown as MessageData[]
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
    try {
      await this.client.complete(data)
    } catch (e) {
      console.log('err', e)
    }
  }
  async stop(chatId: string) {
    const data = this.state.chatPending[chatId]
    if (data?.pending) {
      data.abortController?.abort()
      this.setState((state) => {
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
  async deleteChat(id: string) {
    if (this.state.selectedChat?.id === id) {
      this.navigate$.next('/chat')
    }
    this.setState((state) => {
      state.chats = state.chats.filter((c) => c.id !== id)
    })
    await trpc.chat.deleteChat.mutate({ id })
    this.chatsMap.delete(id)
  }
}

export const StoreContext = createContext<ChatStore>({} as any)

export const useStore = () => {
  return useContext(StoreContext)
}

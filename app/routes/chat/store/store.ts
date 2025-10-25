import { createContext, useContext } from 'react'
import { StructStore } from './struct'
import { trpc } from '~/.client/trpc'
import { isClient } from '~/lib/utils'
import type { Assistant, MessageFile } from '@prisma/client'
import { Subject } from 'rxjs'
import { ChatClient } from './client'
import type { MessagePart } from '~/types'
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
  height?: number | null
  error?: string | null
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
  chatsMap = new Map<string, (typeof this.state.chats)[number]>()
  scrollToTop$ = new Subject<void>()
  transList$ = new Subject<void>()
  abortController: AbortController | null = null
  client = new ChatClient(this)
  initChatId?: string
  constructor(chatId?: string) {
    super(state)
    this.initChatId = chatId
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
          const addChats = res.map((r) => observable(r))
          state.chats.push(...addChats)
          addChats.forEach((c) => this.chatsMap.set(c.id, c))
        })
      })
  }
  async selectChat(id?: string) {
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
    if (!chat?.messages) {
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

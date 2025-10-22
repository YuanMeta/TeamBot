import dayjs from 'dayjs'
import type { ChatStore, MessageData } from './store'
import { nanoid } from 'nanoid'
import { trpc } from '~/.client/trpc'
import {
  parseJsonEventStream,
  uiMessageChunkSchema,
  type UIMessageChunk
} from 'ai'
export class ChatClient {
  constructor(private readonly store: ChatStore) {}
  async complete(data: { text: string }) {
    const messages: typeof this.store.state.messages = []
    const tChatId = nanoid()
    messages.push({
      tid: nanoid(),
      chatId: this.store.state.selectedChat?.id || tChatId,
      content: data.text,
      role: 'user',
      model: this.store.state.model!,
      updatedAt: dayjs().toDate()
    })
    messages.push({
      tid: nanoid(),
      chatId: this.store.state.selectedChat?.id || tChatId,
      content: '...',
      role: 'assistant',
      model: this.store.state.model!,
      updatedAt: dayjs().add(1, 'second').toDate()
    })
    this.store.setState((state) => {
      state.messages.push(...messages)
    })
    if (this.store.state.selectedChat) {
      const chat = this.store.state.selectedChat
      const addRecord = await trpc.chat.createMessages.mutate({
        chatId: chat.id,
        messages: [
          {
            content: data.text,
            role: 'user'
          },
          {
            role: 'assistant',
            content: '...'
          }
        ]
      })
      this.store.setState((state) => {
        state.messages[state.messages.length - 2].id = addRecord.messages[0].id
        state.messages[state.messages.length - 1].id = addRecord.messages[1].id
      })
    } else {
      const addRecord = await trpc.chat.createChat.mutate({
        assistantId: this.store.state.assistant!.id,
        model: this.store.state.model!,
        messages: [
          {
            content: data.text,
            role: 'user'
          },
          {
            role: 'assistant',
            content: '...'
          }
        ]
      })
      this.store.setState((state) => {
        state.chats.unshift(addRecord.chat)
        state.selectedChat = state.chats[0]
        state.messages[state.messages.length - 2].id = addRecord.messages[0].id
        state.messages[state.messages.length - 2].chatId = addRecord.chat.id
        state.messages[state.messages.length - 1].id = addRecord.messages[1].id
        state.messages[state.messages.length - 1].chatId = addRecord.chat.id
      })
    }
    console.log('list', this.store.state.messages)
    const res = await fetch('/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chatId: this.store.state.selectedChat?.id
      }),
      credentials: 'include'
    })
    const p = parseJsonEventStream<UIMessageChunk>({
      stream: res.body as any,
      schema: uiMessageChunkSchema
    })
    // res.body?.pipeThrough(new TextDecoderStream())
    const reader = p?.getReader()
    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value.success) {
          if (value.value.type === 'reasoning-delta' && value.value.delta) {
            const reasoning = value.value.delta
            this.store.setState((state) => {
              const aiMsg = state.messages[state.messages.length - 1]
              aiMsg.reasoning = (aiMsg.reasoning || '') + reasoning
            })
          } else if (value.value.type === 'text-delta' && value.value.delta) {
            const text = value.value.delta
            this.store.setState((state) => {
              const aiMsg = state.messages[state.messages.length - 1]
              if (!aiMsg.content || aiMsg.content === '...') {
                aiMsg.content = text
              } else {
                aiMsg.content += text
              }
            })
          }
          console.log('value', value.value)
        }
      }
    }
  }
}

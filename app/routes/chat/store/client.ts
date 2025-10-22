import dayjs from 'dayjs'
import type { ChatStore } from './store'
import { nanoid } from 'nanoid'
import { trpc } from '~/.client/trpc'
export class ChatClient {
  constructor(private readonly store: ChatStore) {}
  async complete(data: { text: string }) {
    const messages: typeof this.store.state.messages = []
    messages.push({
      tid: nanoid(),
      chatId: this.store.state.selectedChat?.id || 'tid',
      content: data.text,
      role: 'user',
      model: this.store.state.model!,
      updatedAt: dayjs().toDate()
    })
    messages.push({
      tid: nanoid(),
      chatId: this.store.state.selectedChat?.id || 'tid',
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
      const cacheMessages = this.store.state.messages.slice(-2)
      this.store.setState((state) => {
        state.chats.unshift(addRecord.chat)
        state.selectedChat = state.chats[0]
      })
    }
  }
}

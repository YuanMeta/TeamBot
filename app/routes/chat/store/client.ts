import dayjs from 'dayjs'
import type { ChatStore, MessageData } from './store'
import { nanoid } from 'nanoid'
import { trpc } from '~/.client/trpc'
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
      console.log('list', this.store.state.messages)
    }
  }
}

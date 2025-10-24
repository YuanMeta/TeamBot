import dayjs from 'dayjs'
import type { ChatStore, MessageData } from './store'
import { nanoid } from 'nanoid'
import { trpc } from '~/.client/trpc'
import {
  parseJsonEventStream,
  uiMessageChunkSchema,
  type UIMessageChunk
} from 'ai'
import type { MessagePart } from '~/types'
import { observable, runInAction } from 'mobx'
export class ChatClient {
  abortController: AbortController | null = null
  constructor(private readonly store: ChatStore) {}
  async complete(data: { text: string; onFinish?: () => void }) {
    this.abortController = new AbortController()
    const tChatId = nanoid()
    const userMessage = observable<MessageData>({
      tid: nanoid(),
      chatId: this.store.state.selectedChat?.id || tChatId,
      parts: [{ type: 'text', text: data.text }],
      role: 'user',
      model: this.store.state.model!,
      updatedAt: dayjs().toDate()
    })
    const aiMessage = observable<MessageData>({
      tid: nanoid(),
      chatId: this.store.state.selectedChat?.id || tChatId,
      role: 'assistant',
      model: this.store.state.model!,
      updatedAt: dayjs().add(1, 'second').toDate()
    })
    this.store.setState((state) => {
      state.messages.push(userMessage, aiMessage)
    })
    if (this.store.state.selectedChat) {
      const chat = this.store.state.selectedChat
      const addRecord = await trpc.chat.createMessages.mutate({
        chatId: chat.id,
        userPrompt: data.text
      })
      this.store.setState((state) => {
        state.messages[state.messages.length - 2].id = addRecord.messages[0].id
        state.messages[state.messages.length - 1].id = addRecord.messages[1].id
      })
    } else {
      const addRecord = await trpc.chat.createChat.mutate({
        assistantId: this.store.state.assistant!.id,
        model: this.store.state.model!,
        userPrompt: data.text
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
    const res = await fetch('/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: this.abortController.signal,
      body: JSON.stringify({
        chatId: this.store.state.selectedChat?.id
      }),
      credentials: 'include'
    })
    const p = parseJsonEventStream<UIMessageChunk>({
      stream: res.body as any,
      schema: uiMessageChunkSchema
    })
    const reader = p?.getReader()
    if (reader) {
      let parts: Record<string, MessagePart> = {}
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value.success) {
          runInAction(() => {
            switch (value.value.type) {
              case 'tool-input-start':
                const part = observable({
                  type: 'tool',
                  toolName: value.value.toolName,
                  toolCallId: value.value.toolCallId,
                  input: null,
                  output: '',
                  completed: false,
                  state: 'start'
                })
                parts[part.toolCallId] = part
                this.addPart(part, aiMessage)
                break
              case 'tool-input-error':
                if (parts[value.value.toolCallId]) {
                  parts[value.value.toolCallId].state = 'error'
                  parts[value.value.toolCallId].errorText =
                    value.value.errorText
                }
                break
              case 'tool-input-available':
                if (parts[value.value.toolCallId]) {
                  parts[value.value.toolCallId].input = value.value.input
                }
                break
              case 'tool-output-error':
                if (parts[value.value.toolCallId]) {
                  parts[value.value.toolCallId].state = 'error'
                  parts[value.value.toolCallId].errorText =
                    value.value.errorText
                }
                break
              case 'tool-input-delta':
                if (parts[value.value.toolCallId]) {
                  parts[value.value.toolCallId].output +=
                    value.value.inputTextDelta
                }
                break
              case 'tool-output-available':
                if (parts[value.value.toolCallId]) {
                  parts[value.value.toolCallId].state = 'completed'
                  parts[value.value.toolCallId].output = value.value.output
                }
                break
              case 'text-start':
                const textPart = observable({
                  type: 'text',
                  text: ''
                })
                parts[value.value.id] = textPart
                this.addPart(textPart, aiMessage)
                break
              case 'text-delta':
                if (parts[value.value.id]) {
                  parts[value.value.id].text += value.value.delta
                }
                break
              case 'reasoning-start':
                const reasoningPart = observable({
                  type: 'reasoning',
                  reasoning: '',
                  completed: false
                })
                parts[value.value.id] = reasoningPart
                this.addPart(reasoningPart, aiMessage)
                break
              case 'reasoning-delta':
                if (parts[value.value.id]) {
                  parts[value.value.id].reasoning += value.value.delta
                }
                break
              case 'reasoning-end':
                if (parts[value.value.id]) {
                  parts[value.value.id].completed = true
                }
                break
              case 'finish':
                data.onFinish?.()
                break
            }
          })
          console.log('value', value.value)
        }
      }
    }
  }
  private addPart(part: MessagePart, aiMsg: MessageData) {
    runInAction(() => {
      if (!aiMsg.parts) {
        aiMsg.parts = [part]
      } else {
        aiMsg.parts.push(part)
      }
    })
  }
}

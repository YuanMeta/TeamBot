import dayjs from 'dayjs'
import type { ChatStore, MessageData } from './store'
import { trpc } from '~/.client/trpc'
import {
  parseJsonEventStream,
  uiMessageChunkSchema,
  type UIMessageChunk
} from 'ai'
import type { MessagePart } from 'types'
import { observable, runInAction } from 'mobx'
import { cid, findLast } from '../../../lib/utils'
export class ChatClient {
  private generateTitleSet = new Set<string>()
  constructor(private readonly store: ChatStore) {}
  async complete(data: { text: string; onFinish?: () => void }) {
    console.log('text', data)

    const abortController = new AbortController()
    const tChatId = cid()
    let chat = this.store.state.selectedChat
    const userMessage = observable<MessageData>({
      id: cid(),
      chatId: this.store.state.selectedChat?.id || tChatId,
      parts: [{ type: 'text', text: data.text }],
      role: 'user',
      model: this.store.state.model!,
      updatedAt: dayjs().toDate()
    })
    const aiMessage = observable<MessageData>({
      id: cid(),
      chatId: this.store.state.selectedChat?.id || tChatId,
      role: 'assistant',
      model: this.store.state.model!,
      updatedAt: dayjs().add(1, 'second').toDate()
    })
    if (!chat) {
      this.store.moveChatInput$.next()
    }
    this.store.setState((state) => {
      state.messages.push(userMessage, aiMessage)
    })
    if (chat) {
      await trpc.chat.createMessages.mutate({
        chatId: chat.id,
        userPrompt: data.text
      })
      this.store.setState((state) => {
        const index = state.chats.findIndex((c) => c.id === chat?.id)
        if (index !== -1) {
          state.chats.splice(index, 1)
          state.chats.unshift(chat!)
        }
      })
    } else {
      const addRecord = await trpc.chat.createChat.mutate({
        userMessageId: userMessage.id!,
        assistantMessageId: aiMessage.id!,
        assistantId: this.store.state.assistant!.id,
        model: this.store.state.model!,
        userPrompt: data.text
      })
      this.store.setState((state) => {
        state.chats.unshift(addRecord.chat as any)
        state.selectedChat = state.chats[0]
        state.messages[state.messages.length - 2].chatId = addRecord.chat.id
        state.messages[state.messages.length - 1].chatId = addRecord.chat.id
        state.selectedChat!.messages = state.messages
      })
      setTimeout(() => {
        this.store.navigate$.next(`/chat/${addRecord.chat.id}`)
      }, 200)
      chat = this.store.state.selectedChat!
    }
    setTimeout(() => {
      this.store.scrollToActiveMessage$.next()
    }, 16)
    this.store.setState((state) => {
      state.chatPending[chat.id!] = {
        pending: true,
        abortController
      }
    })
    const res = await fetch('/api/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: abortController.signal,
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
      try {
        let parts: Record<string, MessagePart> = {}
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            if (!chat.title && !this.generateTitleSet.has(chat.id)) {
              this.streamTitle({
                chat: chat,
                chatId: chat.id,
                userPrompt: data.text,
                aiResponse:
                  findLast(
                    chat.messages?.[chat.messages.length - 1].parts!,
                    (item) => item.type === 'text'
                  )?.text || ''
              })
            }
            break
          }
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
                    const text = parts[value.value.id].text as string
                    if (
                      !chat.title &&
                      text &&
                      text.length > 200 &&
                      !this.generateTitleSet.has(chat.id)
                    ) {
                      const content = text.match(/^[\s\S]*(?=\n[^\n]*$)/)
                      if (content?.[0]?.length && content[0].length > 100) {
                        this.streamTitle({
                          chat: chat,
                          chatId: chat.id,
                          userPrompt: data.text,
                          aiResponse: content[0]
                        })
                      }
                    }
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
                case 'error':
                  const text = value.value.errorText
                  runInAction(() => {
                    aiMessage.error = text
                  })
                  break
                case 'finish':
                  data.onFinish?.()
                  break
              }
            })
            // console.log('value', value.value)
          }
        }
      } catch (e: any) {
        if (e.name === 'AbortError') {
          runInAction(() => {
            aiMessage.terminated = true
          })
        }
        console.error(e)
      } finally {
        this.store.setState((state) => {
          state.chatPending[chat.id!] = {
            pending: false,
            abortController: undefined
          }
        })
        reader.releaseLock()
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
  async streamTitle(data: {
    chat: ChatStore['state']['selectedChat']
    chatId: string
    userPrompt: string
    aiResponse: string
  }) {
    if (this.generateTitleSet.has(data.chatId)) return
    this.generateTitleSet.add(data.chatId)
    const res = await fetch('/api/title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chatId: data.chatId,
        userPrompt: data.userPrompt,
        aiResponse: data.aiResponse
      }),
      credentials: 'include'
    })
    const p = parseJsonEventStream<UIMessageChunk>({
      stream: res.body as any,
      schema: uiMessageChunkSchema
    })
    const reader = p?.getReader()
    if (reader) {
      try {
        let text = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value.success && value.value.type === 'text-delta') {
            text += value.value.delta
            runInAction(() => {
              data.chat!.title = text
            })
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        this.generateTitleSet.delete(data.chatId)
        reader.releaseLock()
      }
    }
  }
}

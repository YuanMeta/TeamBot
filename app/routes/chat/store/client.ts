import dayjs from 'dayjs'
import type { ChatData, ChatStore, MessageData } from './store'
import { trpc } from '~/.client/trpc'
import { parseJsonEventStream, type UIMessageChunk } from 'ai'
import type { MessagePart, ReasonPart, TextPart, ToolPart } from 'types'
import { observable, runInAction } from 'mobx'
import { cid, fileToBase64, findLast } from '../../../lib/utils'
import { uiMessageChunkSchema, type TemaMessageChunk } from './msgSchema'
export class ChatClient {
  private generateTitleSet = new Set<string>()
  constructor(private readonly store: ChatStore) {}
  async complete(data: {
    text: string
    docs: { name: string; content: string }[]
    images: File[]
    onFinish?: () => void
  }) {
    const assistantId = this.store.state.assistant!.id
    const model = this.store.state.model!
    const abortController = new AbortController()
    const tChatId = cid()
    let chat = this.store.state.selectedChat

    const userMessage = observable<MessageData>({
      id: cid(),
      chatId: this.store.state.selectedChat?.id || tChatId,
      text: data.text,
      role: 'user',
      context: data.docs?.length ? { docs: data.docs } : null,
      model: model,
      files: data.images,
      updatedAt: dayjs().toDate()
    })
    const aiMessage = observable<MessageData>({
      id: cid(),
      chatId: this.store.state.selectedChat?.id || tChatId,
      role: 'assistant',
      model: model,
      updatedAt: dayjs().add(1, 'second').toDate()
    })
    if (!chat) {
      this.store.moveChatInput$.next()
    }
    this.store.setState((state) => {
      state.messages.push(userMessage, aiMessage)
    })

    const searchQuery = await this.getSearchQuery(data.text)
    if (searchQuery.query) {
      runInAction(() => {
        userMessage.context = observable({
          ...userMessage.context,
          searchResult: {
            query: searchQuery.query!
          }
        })
      })
      try {
        const res = await trpc.chat.searchWeb.query({
          keyword: searchQuery.query,
          assistantId,
          model: model,
          webSearchId: searchQuery.webSearchId,
          query: data.text
        })
        runInAction(() => {
          userMessage.context!.searchResult!.results = res.results
          userMessage.context!.searchResult!.summary = res.summary || undefined
        })
      } catch (e: any) {
        console.error(e)
        runInAction(() => {
          userMessage.context!.searchResult!.error = e.message
        })
      }
    }
    const openSearch = this.store.state.openWebSearch
    if (chat) {
      await trpc.chat.createMessages.mutate({
        chatId: chat.id,
        userPrompt: data.text,
        context: userMessage.context || null,
        userMessageId: userMessage.id!,
        assistantMessageId: aiMessage.id!
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
        userPrompt: data.text,
        context: userMessage.context
      })
      this.store.setState((state) => {
        state.chats.unshift(addRecord.chat as any)
        state.selectedChat = state.chats[0]
        state.messages[state.messages.length - 2].chatId = addRecord.chat.id
        state.messages[state.messages.length - 1].chatId = addRecord.chat.id
        state.selectedChat!.messages = state.messages
      })
      this.store.navigate$.next(`/chat/${addRecord.chat.id}`)
      chat = this.store.state.selectedChat!
      if (openSearch) {
        this.store.toggleWebSearch(chat.id)
      }
    }
    setTimeout(() => {
      this.store.scrollToActiveMessage$.next()
    }, 16)
    this.store.setState((state) => {
      state.chatPending[chat.id!] = {
        pending: true,
        abortController
      }
      chat.messages = state.messages
    })
    const images: string[] = []
    if (data.images?.length) {
      const base64 = await fileToBase64(data.images[0])
      images.push(base64)
    }
    return this.completion(chat, {
      assistantId,
      model,
      images,
      onFinish: () => {
        data.onFinish?.()
        if (!chat.title && !this.generateTitleSet.has(chat.id)) {
          this.streamTitle({
            chat: chat,
            userPrompt: data.text,
            aiResponse:
              findLast(
                chat.messages?.[chat.messages.length - 1].parts!,
                (item) => item.type === 'text'
              )?.text || ''
          })
        }
      },
      onGenerateTitle: (userPrompt, aiResponse) => {
        if (!chat.title && !this.generateTitleSet.has(chat.id)) {
          this.streamTitle({
            chat: chat,
            userPrompt,
            aiResponse
          })
        }
      }
    })
  }
  private async getSearchQuery(text: string) {
    const openSearch = this.store.state.openWebSearch
    if (
      this.store.state.assistant?.webSearchId &&
      (openSearch || !this.store.state.assistant?.options.agentWebSearch)
    ) {
      const res = await trpc.chat.getSearchInfoByQuestion.query({
        assistantId: this.store.state.assistant!.id,
        model: this.store.state.model!,
        question: text
      })
      return {
        query: res.action === 'search' ? res.query : null,
        webSearchId: this.store.state.assistant!.webSearchId
      }
    }
    return { query: null, webSearchId: this.store.state.assistant!.webSearchId }
  }
  private async completion(
    chat: ChatData,
    options: {
      assistantId: number
      model: string
      images?: string[]
      onFinish?: () => void
      onGenerateTitle?: (userPrompt: string, aiResponse: string) => void
      onChunk?: (chunk: TemaMessageChunk) => void
    }
  ) {
    const abortController = new AbortController()
    const [userMessage, aiMessage] = chat.messages!.slice(-2)
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
        chatId: chat.id,
        assistantId: options.assistantId,
        model: options.model,
        repoIds: undefined,
        regenerate: undefined,
        images: options.images,
        webSearch: this.store.state.openWebSearch
      }),
      credentials: 'include'
    })
    const p = parseJsonEventStream<TemaMessageChunk>({
      stream: res.body as any,
      // @ts-ignore
      schema: null
    })
    const reader = p?.getReader()
    if (reader) {
      try {
        let parts: Record<string, MessagePart> = {}
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          if (value.success) {
            options.onChunk?.(value.value)
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
                  } as ToolPart)
                  parts[part.toolCallId] = part
                  this.addPart(part, aiMessage)
                  break
                case 'tool-input-error':
                  if (parts[value.value.toolCallId]) {
                    ;(parts[value.value.toolCallId] as ToolPart).state =
                      'error' as const
                    ;(parts[value.value.toolCallId] as ToolPart).errorText =
                      value.value.errorText
                    ;(parts[value.value.toolCallId] as ToolPart).input =
                      value.value.input
                  }
                  break
                case 'tool-input-available':
                  if (parts[value.value.toolCallId]) {
                    ;(parts[value.value.toolCallId] as ToolPart).input =
                      value.value.input
                  }
                  break
                case 'tool-output-error':
                  if (parts[value.value.toolCallId]) {
                    ;(parts[value.value.toolCallId] as ToolPart).state =
                      'error' as const
                    ;(parts[value.value.toolCallId] as ToolPart).errorText =
                      value.value.errorText
                  }
                  break
                case 'tool-input-delta':
                  if (parts[value.value.toolCallId]) {
                    ;(parts[value.value.toolCallId] as ToolPart).output +=
                      value.value.inputTextDelta
                  }
                  break
                case 'tool-output-available':
                  const tool = parts[value.value.toolCallId] as ToolPart
                  if (tool) {
                    tool.state = 'completed' as const
                    tool.output = value.value.output
                    if (
                      tool.toolName === 'web_search' &&
                      typeof tool.output === 'string'
                    ) {
                      if (aiMessage) {
                        trpc.chat.getMsgContext
                          .query(aiMessage.id!)
                          .then((res) => {
                            runInAction(() => {
                              aiMessage.context = res.context
                            })
                          })
                      }
                    }
                  }
                  break
                case 'text-start':
                  const textPart = observable({
                    type: 'text',
                    text: ''
                  })
                  parts[value.value.id] = textPart as TextPart
                  this.addPart(textPart as MessagePart, aiMessage)
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
                        options.onGenerateTitle?.(userMessage.text!, content[0])
                      }
                    }
                  }
                  break
                case 'reasoning-start':
                  const reasoningPart = observable({
                    type: 'reasoning',
                    reasoning: '',
                    completed: false
                  } as ReasonPart)
                  parts[value.value.id] = reasoningPart
                  this.addPart(reasoningPart as MessagePart, aiMessage)
                  break
                case 'reasoning-delta':
                  if (parts[value.value.id]) {
                    ;(parts[value.value.id] as ReasonPart).reasoning +=
                      value.value.delta
                  }
                  break
                case 'reasoning-end':
                  if (parts[value.value.id]) {
                    ;(parts[value.value.id] as ReasonPart).completed = true
                  }
                  break
                case 'error':
                  const text = value.value.errorText
                  runInAction(() => {
                    aiMessage.error = text
                  })
                  break
                case 'finish':
                  options.onFinish?.()
                  break
              }
            })
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
    chat: ChatData
    userPrompt: string
    aiResponse: string
  }) {
    if (this.generateTitleSet.has(data.chat.id) || data.chat.title) return
    this.generateTitleSet.add(data.chat.id)
    const res = await fetch('/api/title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chatId: data.chat.id,
        userPrompt: data.userPrompt,
        aiResponse: data.aiResponse,
        assistantId: this.store.state.assistant!.id,
        model: this.store.state.model!
      }),
      credentials: 'include'
    })
    const p = parseJsonEventStream<UIMessageChunk>({
      stream: res.body as any,
      schema: uiMessageChunkSchema as any
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
        this.generateTitleSet.delete(data.chat.id)
        reader.releaseLock()
      }
    }
  }
  async regenerate(index: number, userPrompt?: string) {
    const chat = this.store.state.selectedChat
    if (!chat) return
    const offset = index + 1
    const message = chat.messages!.slice(0, offset)
    const removeMessages = chat.messages!.slice(offset)
    const [userMessage, aiMessage] = message.slice(-2)
    this.store.setState((state) => {
      state.messages = message
      if (userPrompt) {
        userMessage.text = userPrompt
      }
      chat.messages = message
      const lastMessage = message[message.length - 1]
      lastMessage.parts = undefined
      lastMessage.terminated = false
      lastMessage.error = undefined
    })
    this.store.scrollToActiveMessage$.next()
    await trpc.chat.regenerate.mutate({
      chatId: chat.id!,
      removeMessages: removeMessages.map((m) => m.id!),
      offset,
      aiMessageId: aiMessage.id!,
      userMessage: userPrompt
        ? {
            msgId: userMessage.id!,
            prompt: userPrompt
          }
        : undefined
    })
    const assistantId = this.store.state.assistant!.id
    const model = this.store.state.model!
    return this.completion(chat, {
      assistantId,
      model
    })
  }
}

import { useState } from 'react'
import type { Route } from './+types/ai-chat'
import {
  DefaultChatTransport,
  parsePartialJson,
  parseJsonEventStream,
  uiMessageChunkSchema,
  type UIMessageChunk
} from 'ai'
import { useChat, useCompletion } from '@ai-sdk/react'
export function meta({}: Route.MetaArgs) {
  return [
    { title: 'AI Chat - 流式对话示例' },
    { name: 'description', content: 'AI 流式对话演示' }
  ]
}

export default function AIChat() {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [finalMessage, setFinalMessage] = useState<any>(null)
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/ai-stream'
    }),
    onToolCall: (toolCall) => {
      console.log('tool call', toolCall)
    },
    onFinish: ({ message, messages, isAbort, isDisconnect, isError }) => {
      // 在流结束时拿到最终的 AI 消息（UIMessage 结构）
      setFinalMessage(message)
      console.log('AI stream finished', {
        isAbort,
        isDisconnect,
        isError,
        message
      })
    }
  })
  console.log(messages)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsLoading(true)
    setResponse('')

    try {
      // sendMessage({
      //   parts: [
      //     {
      //       type: 'text',
      //       text: prompt
      //     }
      //   ]
      // })
      const res = await fetch(`/ai-stream?prompt=${encodeURIComponent(prompt)}`)
      const p = parseJsonEventStream<UIMessageChunk>({
        stream: res.body as any,
        schema: uiMessageChunkSchema
      })
      // res.body?.pipeThrough(new TextDecoderStream())
      const reader = p?.getReader()
      const decoder = new TextDecoder()
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          // const a = value as unknown as UIMessageChunk
          // console.log('value', value)
          if (value.success) {
            console.log('value', value.value)
          }
          // 直接解码文本流

          // const chunk = decoder.decode(value, { stream: true })
          // parseJsonEventStream({
          //   stream:
          // }).then((res) => {
          //   console.log('res-----', res)
          // })
          // if (chunk) {
          //   setResponse((prev) => prev + chunk)
          // }
        }
      }
    } catch (error) {
      console.error('Stream error:', error)
      setResponse('发生错误：' + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8'>
      <div className='max-w-4xl mx-auto px-4'>
        <div className='bg-white rounded-xl shadow-lg p-8'>
          <h1 className='text-3xl font-bold mb-2 text-gray-900'>
            🤖 AI 流式对话
          </h1>
          <div>User</div>
          <form onSubmit={handleSubmit} className='mb-6'>
            <div className='flex gap-2'>
              <input
                type='text'
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='输入你的问题...'
                className='flex-1 px-4 text-black py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                disabled={isLoading}
              />
              <button
                type='submit'
                disabled={isLoading || !prompt.trim()}
                className='px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors'
              >
                {isLoading ? '生成中...' : '发送'}
              </button>
            </div>
          </form>

          {/* {response && (
            <div className='bg-gray-50 rounded-lg p-6 border border-gray-200'>
              <h2 className='text-lg font-semibold mb-3 text-gray-800'>
                AI 回复：
              </h2>
              <div className='prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap'>
                {response}
                {isLoading && (
                  <span className='inline-block w-2 h-4 bg-blue-600 ml-1 animate-pulse'></span>
                )}
              </div>
            </div>
          )} */}
          {messages.map((message) => (
            <div key={message.id}>
              {message.role === 'user' ? 'User: ' : 'AI: '}
              {message.parts.map((part, index) =>
                part.type === 'text' ? (
                  <span key={index}>{part.text}</span>
                ) : null
              )}
            </div>
          ))}
          <pre>{JSON.stringify(messages, null, 2)}</pre>
          {!response && !isLoading && (
            <div className='text-center py-12 text-gray-400'>
              <svg
                className='w-16 h-16 mx-auto mb-4 opacity-50'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
                />
              </svg>
              <p>输入问题开始对话</p>
            </div>
          )}
        </div>

        <div className='mt-8 bg-white rounded-xl shadow-lg p-6'>
          <h2 className='text-xl font-bold mb-4 text-gray-900'>📝 使用说明</h2>
          <div className='space-y-4 text-gray-600'>
            <div>
              <h3 className='font-semibold text-gray-800 mb-2'>API 端点：</h3>
              <code className='block bg-gray-900 text-gray-100 p-3 rounded-md text-sm'>
                GET /ai-stream?prompt=你的问题
              </code>
            </div>
            <div>
              <h3 className='font-semibold text-gray-800 mb-2'>环境配置：</h3>
              <p className='mb-2'>需要配置 OPENAI_API_KEY 环境变量：</p>
              <code className='block bg-gray-900 text-gray-100 p-3 rounded-md text-sm'>
                export OPENAI_API_KEY=your_api_key_here
              </code>
            </div>
            <div>
              <h3 className='font-semibold text-gray-800 mb-2'>响应格式：</h3>
              <p>使用 AI SDK 的 Text Stream 格式，纯文本流式响应。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage
} from 'ai'
import type { Route } from './+types/completions'
import z from 'zod'

const InputSchema = z.object({
  chatId: z.string(),
  regenerate: z.boolean().optional(),
  repoId: z.string().array().optional()
})

export async function action({ request }: Route.LoaderArgs) {
  const json = await request.json()
  // const { messages }: { messages: UIMessage[] } = json
  const messages: UIMessage[] = []
  messages.push({
    id: '123',
    role: 'assistant',
    parts: [
      {
        type: 'dynamic-tool',
        toolName: 'getWeather',
        toolCallId: '123',
        state: 'output-available',
        input: {
          city: '北京'
        },
        output: {
          city: '北京'
        }
      },
      {
        type: 'text',
        text: '这里是来自ai的回答'
      }
    ]
  })
  // messages.push({
  //   parts: [
  //     {
  //       type: 'text',
  //       text: '你好'
  //     }
  //   ],
  //   role: 'user',
  //   id: '123',
  //   metadata: {
  //     stepCount: 0
  //   }
  // })
  // 定义工具（可选）

  // 使用 AI SDK 生成流式文本，包含工具
  const result = streamText({
    model: 'gpt-4o-mini',
    // prompt: prompt,
    // tools, // 工具会在需要时自动调用,
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    toolChoice: {
      toolName: '',
      type: 'tool'
    },
    onStepFinish: (data) => {
      console.log('step finish', data)
    },
    onError: (error) => {
      console.log('error', error)
    }
  })

  return result.toUIMessageStreamResponse({
    onFinish: ({
      responseMessage,
      messages: uiMessages,
      isContinuation,
      isAborted
    }) => {
      // 在服务端可拿到最终返回给客户端的 UIMessage
      console.log('UI stream finished', {
        isContinuation,
        isAborted,
        responseMessage
      })
    }
  })
}

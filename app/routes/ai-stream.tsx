import type { Route } from './+types/ai-stream'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createDeepSeek } from '@ai-sdk/deepseek'
import {
  streamText,
  tool,
  type UIMessage,
  convertToModelMessages,
  stepCountIs
} from 'ai'
import { z } from 'zod'

const tools = {
  getWeather: tool({
    description: '获取指定城市的天气信息',
    inputSchema: z.object({
      city: z.string().describe('城市名称')
    }),
    execute: async ({ city }: { city: string }) => {
      // 模拟天气查询
      return {
        city,
        temperature: 22,
        condition: '晴天',
        humidity: 65
      }
    }
  }),
  calculate: tool({
    description: '执行数学计算',
    inputSchema: z.object({
      expression: z.string().describe('数学表达式')
    }),
    execute: async ({ expression }: { expression: string }) => {
      try {
        // 简单的计算示例（生产环境应使用安全的计算库）
        return { result: eval(expression) }
      } catch (error) {
        return { error: '计算失败' }
      }
    }
  })
}
export async function loader({ request }: Route.LoaderArgs) {
  // return json({ prompt })
  const result = streamText({
    model: 'deepseek-reasoner',
    prompt: '你好',
    stopWhen: stepCountIs(10),
    tools,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 1000,
          includeThoughts: true
        }
      }
    },
    onStepFinish: (data) => {
      console.log('step finish', data)
    },
    onError: (error) => {
      console.log('error', error)
    }
  })

  for await (const part of result.fullStream) {
    if (part.type === 'reasoning-delta') {
      // This is the reasoning text
      console.log('Reasoning:', part.text)
    } else if (part.type === 'text-delta') {
      // This is the final answer
      console.log('Answer:', part.text)
    }
  }
  return result.toUIMessageStreamResponse({
    onFinish: async ({
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
export async function action({ request }: Route.LoaderArgs) {
  const json = await request.json()
  const { messages }: { messages: UIMessage[] } = json
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
    tools, // 工具会在需要时自动调用,
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
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

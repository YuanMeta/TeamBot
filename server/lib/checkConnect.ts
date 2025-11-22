import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { TRPCError } from '@trpc/server'
import { generateText, streamText, type LanguageModel } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createTeamAI } from './provider/openai-provider'
export const createClient = (data: {
  mode: string
  api_key: string | null
  base_url: string | null
}) => {
  switch (data.mode) {
    case 'openai':
      return createOpenAI({
        apiKey: data.api_key ?? undefined,
        baseURL: data.base_url ?? undefined
      })
    case 'openrouter':
      return createOpenRouter({
        apiKey: data.api_key ?? undefined
      })
    case 'anthropic':
      return createAnthropic({
        apiKey: data.api_key ?? undefined,
        baseURL: data.base_url ?? undefined
      })
    case 'gemini':
      return createGoogleGenerativeAI({
        apiKey: data.api_key ?? undefined,
        baseURL: data.base_url ?? undefined
      })
    case 'deepseek':
      return createDeepSeek({
        apiKey: data.api_key ?? undefined,
        baseURL: data.base_url ?? undefined
      })
    case 'qwen':
      return createOpenAICompatible({
        apiKey: data.api_key ?? undefined,
        baseURL:
          data.base_url ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        name: 'qwen'
      })
    case 'z-ai':
      return createOpenAICompatible({
        apiKey: data.api_key ?? undefined,
        baseURL: data.base_url ?? 'https://open.bigmodel.cn/api/paas/v4',
        includeUsage: true,
        name: 'z-ai'
      })
    case 'moonshotai':
      return createOpenAICompatible({
        apiKey: data.api_key ?? undefined,
        baseURL: data.base_url ?? 'https://api.moonshot.cn/v1',
        name: 'moonshot'
      })
    case 'doubao':
      return createOpenAICompatible({
        apiKey: data.api_key ?? undefined,
        baseURL: data.base_url ?? 'https://ark.cn-beijing.volces.com/api/v3',
        name: 'doubao'
      })
  }
}
export const checkLLmConnect = async (provider: {
  mode: string
  api_key: string | null
  base_url: string | null
  models: string[]
}) => {
  const models = provider.models as string[]
  const client = createClient(provider)!
  const llm = client(models[0])
  try {
    await generateText({
      model: llm!,
      prompt: 'hello',
      maxOutputTokens: 30
    })
    return {
      success: true,
      message: '连接成功'
    }
  } catch (e: any) {
    console.log('e', e)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: e.message
    })
  }
}

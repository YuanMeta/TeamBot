import { createOpenAI } from '@ai-sdk/openai'
import { TRPCError } from '@trpc/server'
import { generateText, streamText, type LanguageModel } from 'ai'

export const checkLLmConnect = async (provider: {
  mode: string
  apiKey: string | null
  baseUrl: string | null
  models: string[]
}) => {
  const models = provider.models as string[]
  let llm: LanguageModel
  switch (provider.mode) {
    case 'openai':
      const openai = createOpenAI({
        apiKey: provider.apiKey ?? '',
        baseURL: provider.baseUrl ?? undefined
      })
      llm = openai(models[0])
    case 'anthropic':

    case 'gemini':

    case 'deepseek':
  }
  try {
    const res = await generateText({
      model: llm!,
      prompt: 'hello',
      maxOutputTokens: 100
      // abortSignal: AbortSignal.timeout(1000)
    })
    return {
      success: true,
      message: '连接成功',
      data: res.content
    }
  } catch (e: any) {
    console.log('e', e, e.message)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: e.message
    })
  }
}

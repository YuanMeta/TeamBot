import type { LanguageModelV2, ProviderV2 } from '@ai-sdk/provider'
import { type FetchFunction, withUserAgentSuffix } from '@ai-sdk/provider-utils'
import { openaiTools } from './openai-tools'
import { OpenAIChatLanguageModel } from './chat-language.model'

export interface OpenAIProvider extends ProviderV2 {
  (modelId: string): LanguageModelV2
  tools: typeof openaiTools
}

export interface OpenAIProviderSettings {
  /**
Base URL for the OpenAI API calls.
     */
  baseURL?: string

  /**
API key for authenticating requests.
     */
  apiKey?: string

  /**
OpenAI Organization.
     */
  organization?: string

  /**
OpenAI project.
     */
  project?: string

  /**
Custom headers to include in the requests.
     */
  headers?: Record<string, string>

  /**
Provider name. Overrides the `openai` default name for 3rd party providers.
   */
  name?: string

  /**
Custom fetch implementation. You can use it as a middleware to intercept requests,
or to provide a custom fetch implementation for e.g. testing.
    */
  fetch?: FetchFunction
}

/**
Create an OpenAI provider instance.
 */
export function createTeamAI(
  options: OpenAIProviderSettings = {}
): OpenAIProvider {
  const baseURL = options.baseURL

  const providerName = options.name ?? 'openai'

  const getHeaders = () =>
    withUserAgentSuffix({
      Authorization: `Bearer ${options.apiKey}`,
      ...options.headers
    })

  const createChatModel = (modelId: string) =>
    new OpenAIChatLanguageModel(modelId, {
      provider: `${providerName}.chat`,
      baseURL,
      apiKey: options.apiKey,
      headers: getHeaders,
      fetch: options.fetch
    })

  const provider = function (modelId: string) {
    return createChatModel(modelId)
  }

  provider.tools = openaiTools

  return provider as unknown as OpenAIProvider
}

/**
Default OpenAI provider instance.
 */
export const teamai = createTeamAI()

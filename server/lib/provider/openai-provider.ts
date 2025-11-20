import { type LanguageModelV2, type ProviderV2 } from '@ai-sdk/provider'
import { type FetchFunction, withUserAgentSuffix } from '@ai-sdk/provider-utils'
import { OpenAIChatLanguageModel } from './chat/openai-chat-language-model'
import { type OpenAIChatModelId } from './chat/openai-chat-options'
import { OpenAICompletionLanguageModel } from './completion/openai-completion-language-model'
import { type OpenAICompletionModelId } from './completion/openai-completion-options'
import { openaiTools } from './openai-tools'
import { OpenAIResponsesLanguageModel } from './responses/openai-responses-language-model'
import { type OpenAIResponsesModelId } from './responses/openai-responses-options'

export interface TeamAIProvider
  extends Omit<ProviderV2, 'textEmbeddingModel' | 'imageModel'> {
  (modelId: OpenAIResponsesModelId): LanguageModelV2

  /**
Creates an OpenAI model for text generation.
   */
  languageModel(modelId: OpenAIResponsesModelId): LanguageModelV2

  /**
Creates an OpenAI chat model for text generation.
   */
  chat(modelId: OpenAIChatModelId): LanguageModelV2

  /**
Creates an OpenAI responses API model for text generation.
   */
  responses(modelId: OpenAIResponsesModelId): LanguageModelV2

  /**
Creates an OpenAI completion model for text generation.
   */
  completion(modelId: OpenAICompletionModelId): LanguageModelV2

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
): TeamAIProvider {
  const baseURL = options.baseURL

  const providerName = options.name ?? 'openai'

  const getHeaders = () =>
    withUserAgentSuffix({
      Authorization: `Bearer ${options.apiKey}`,
      ...options.headers
    })

  const createChatModel = (modelId: OpenAIChatModelId) =>
    new OpenAIChatLanguageModel(modelId, {
      provider: `${providerName}.chat`,
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch
    })

  const createCompletionModel = (modelId: OpenAICompletionModelId) =>
    new OpenAICompletionLanguageModel(modelId, {
      provider: `${providerName}.completion`,
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch
    })

  const createLanguageModel = (modelId: OpenAIResponsesModelId) => {
    if (new.target) {
      throw new Error(
        'The OpenAI model function cannot be called with the new keyword.'
      )
    }

    return createResponsesModel(modelId)
  }

  const createResponsesModel = (modelId: OpenAIResponsesModelId) => {
    return new OpenAIResponsesLanguageModel(modelId, {
      provider: `${providerName}.responses`,
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch
    })
  }

  const provider = function (modelId: OpenAIResponsesModelId) {
    return createLanguageModel(modelId)
  }

  provider.languageModel = createLanguageModel
  provider.chat = createChatModel
  provider.completion = createCompletionModel
  provider.responses = createResponsesModel

  provider.tools = openaiTools

  return provider as TeamAIProvider
}

/**
Default OpenAI provider instance.
 */
export const openai = createTeamAI()

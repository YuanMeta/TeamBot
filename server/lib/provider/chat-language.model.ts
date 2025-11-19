import {
  InvalidResponseDataError,
  type LanguageModelV2,
  type LanguageModelV2CallOptions,
  type LanguageModelV2CallWarning,
  type LanguageModelV2Content,
  type LanguageModelV2FinishReason,
  type LanguageModelV2StreamPart,
  type LanguageModelV2Usage,
  type SharedV2ProviderMetadata
} from '@ai-sdk/provider'
import {
  type FetchFunction,
  type ParseResult,
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  generateId,
  isParsableJson,
  parseProviderOptions,
  postJsonToApi
} from '@ai-sdk/provider-utils'
import { convertToOpenAIChatMessages } from './convert-to-openai-chat-messages'
import { getResponseMetadata } from './get-response-metadata'
import { mapOpenAIFinishReason } from './map-openai-finish-reason'
import {
  type OpenAIChatChunk,
  openaiChatChunkSchema,
  openaiChatResponseSchema
} from './openai-chat-api'
import { prepareChatTools } from './openai-chat-prepare-tools'
import { openaiFailedResponseHandler } from './openai-error'

type OpenAIChatConfig = {
  provider: string
  headers: () => Record<string, string | undefined>
  baseURL?: string
  apiKey?: string
  fetch?: FetchFunction
}

export class OpenAIChatLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = 'v2'

  readonly modelId: string

  readonly supportedUrls = {
    'image/*': [/^https?:\/\/.*$/]
  }

  private readonly config: OpenAIChatConfig

  constructor(modelId: string, config: OpenAIChatConfig) {
    this.modelId = modelId
    this.config = config
  }

  get provider(): string {
    return this.config.provider
  }

  private async getArgs({
    prompt,
    maxOutputTokens,
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    stopSequences,
    responseFormat,
    seed,
    tools,
    toolChoice,
    providerOptions
  }: LanguageModelV2CallOptions) {
    const warnings: LanguageModelV2CallWarning[] = []

    if (topK != null) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'topK'
      })
    }

    if (responseFormat?.type === 'json' && responseFormat.schema != null) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'responseFormat',
        details:
          'JSON response format schema is only supported with structuredOutputs'
      })
    }

    const { messages, warnings: messageWarnings } = convertToOpenAIChatMessages(
      {
        prompt,
        systemMessageMode: getSystemMessageMode(this.modelId)
      }
    )

    warnings.push(...messageWarnings)

    const baseArgs = {
      model: this.modelId,
      max_tokens: maxOutputTokens,
      temperature,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      stop: stopSequences,
      seed,
      messages
    }
    const {
      tools: openaiTools,
      toolChoice: openaiToolChoice,
      toolWarnings
    } = prepareChatTools({
      tools,
      toolChoice,
      strictJsonSchema: false,
      structuredOutputs: false
    })

    return {
      args: {
        ...baseArgs,
        tools: openaiTools,
        tool_choice: openaiToolChoice
      },
      warnings: [...warnings, ...toolWarnings]
    }
  }

  async doGenerate(
    options: Parameters<LanguageModelV2['doGenerate']>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV2['doGenerate']>>> {
    const { args: body, warnings } = await this.getArgs(options)

    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse
    } = await postJsonToApi({
      url: `${this.config.baseURL}/chat/completions`,
      headers: combineHeaders({
        Authorization: `Bearer ${this.config.apiKey}`,
        ...options.headers
      }),
      body,
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        openaiChatResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    })

    const choice = response.choices[0]
    const content: Array<LanguageModelV2Content> = []

    // text content:
    const text = choice.message.content
    if (text != null && text.length > 0) {
      content.push({ type: 'text', text })
    }

    // tool calls:
    for (const toolCall of choice.message.tool_calls ?? []) {
      content.push({
        type: 'tool-call' as const,
        toolCallId: toolCall.id ?? generateId(),
        toolName: toolCall.function.name,
        input: toolCall.function.arguments!
      })
    }

    // annotations/citations:
    for (const annotation of choice.message.annotations ?? []) {
      content.push({
        type: 'source',
        sourceType: 'url',
        id: generateId(),
        url: annotation.url,
        title: annotation.title
      })
    }

    // provider metadata:
    const completionTokenDetails = response.usage?.completion_tokens_details
    const promptTokenDetails = response.usage?.prompt_tokens_details
    const providerMetadata: SharedV2ProviderMetadata = { openai: {} }
    if (completionTokenDetails?.accepted_prediction_tokens != null) {
      providerMetadata.openai.acceptedPredictionTokens =
        completionTokenDetails?.accepted_prediction_tokens
    }
    if (completionTokenDetails?.rejected_prediction_tokens != null) {
      providerMetadata.openai.rejectedPredictionTokens =
        completionTokenDetails?.rejected_prediction_tokens
    }
    if (choice.logprobs?.content != null) {
      providerMetadata.openai.logprobs = choice.logprobs.content
    }

    return {
      content,
      finishReason: mapOpenAIFinishReason(choice.finish_reason),
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? undefined,
        outputTokens: response.usage?.completion_tokens ?? undefined,
        totalTokens: response.usage?.total_tokens ?? undefined,
        reasoningTokens: completionTokenDetails?.reasoning_tokens ?? undefined,
        cachedInputTokens: promptTokenDetails?.cached_tokens ?? undefined
      },
      request: { body },
      response: {
        ...getResponseMetadata(response),
        headers: responseHeaders,
        body: rawResponse
      },
      warnings,
      providerMetadata
    }
  }

  async doStream(
    options: Parameters<LanguageModelV2['doStream']>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV2['doStream']>>> {
    const { args, warnings } = await this.getArgs(options)

    const body = {
      ...args,
      stream: true,
      stream_options: {
        include_usage: true
      }
    }
    console.log('stream body', body)

    const { responseHeaders, value: response } = await postJsonToApi({
      url: `${this.config.baseURL}/chat/completions`,
      headers: combineHeaders({
        Authorization: `Bearer ${this.config.apiKey}`,
        ...options.headers
      }),
      body,
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(
        openaiChatChunkSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    })

    const toolCalls: Array<{
      id: string
      type: 'function'
      function: {
        name: string
        arguments: string
      }
      hasFinished: boolean
    }> = []

    let finishReason: LanguageModelV2FinishReason = 'unknown'
    const usage: LanguageModelV2Usage = {
      inputTokens: undefined,
      outputTokens: undefined,
      totalTokens: undefined
    }
    let metadataExtracted = false
    let isActiveText = false

    const providerMetadata: SharedV2ProviderMetadata = { openai: {} }

    return {
      stream: response.pipeThrough(
        new TransformStream<
          ParseResult<OpenAIChatChunk>,
          LanguageModelV2StreamPart
        >({
          start(controller) {
            controller.enqueue({ type: 'stream-start', warnings })
          },

          transform(chunk, controller) {
            if (options.includeRawChunks) {
              controller.enqueue({ type: 'raw', rawValue: chunk.rawValue })
            }

            // handle failed chunk parsing / validation:
            if (!chunk.success) {
              finishReason = 'error'
              controller.enqueue({ type: 'error', error: chunk.error })
              return
            }

            const value = chunk.value

            // handle error chunks:
            if ('error' in value) {
              finishReason = 'error'
              controller.enqueue({ type: 'error', error: value.error })
              return
            }

            // extract and emit response metadata once. Usually it comes in the first chunk.
            // Azure may prepend a chunk with a `"prompt_filter_results"` key which does not contain other metadata,
            // https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/content-filter-annotations?tabs=powershell
            if (!metadataExtracted) {
              const metadata = getResponseMetadata(value)
              if (Object.values(metadata).some(Boolean)) {
                metadataExtracted = true
                controller.enqueue({
                  type: 'response-metadata',
                  ...getResponseMetadata(value)
                })
              }
            }

            if (value.usage != null) {
              usage.inputTokens = value.usage.prompt_tokens ?? undefined
              usage.outputTokens = value.usage.completion_tokens ?? undefined
              usage.totalTokens = value.usage.total_tokens ?? undefined
              usage.reasoningTokens =
                value.usage.completion_tokens_details?.reasoning_tokens ??
                undefined
              usage.cachedInputTokens =
                value.usage.prompt_tokens_details?.cached_tokens ?? undefined

              if (
                value.usage.completion_tokens_details
                  ?.accepted_prediction_tokens != null
              ) {
                providerMetadata.openai.acceptedPredictionTokens =
                  value.usage.completion_tokens_details?.accepted_prediction_tokens
              }
              if (
                value.usage.completion_tokens_details
                  ?.rejected_prediction_tokens != null
              ) {
                providerMetadata.openai.rejectedPredictionTokens =
                  value.usage.completion_tokens_details?.rejected_prediction_tokens
              }
            }

            const choice = value.choices[0]

            if (choice?.finish_reason != null) {
              finishReason = mapOpenAIFinishReason(choice.finish_reason)
            }

            if (choice?.logprobs?.content != null) {
              providerMetadata.openai.logprobs = choice.logprobs.content
            }

            if (choice?.delta == null) {
              return
            }

            const delta = choice.delta

            if (delta.content != null) {
              if (!isActiveText) {
                controller.enqueue({ type: 'text-start', id: '0' })
                isActiveText = true
              }

              controller.enqueue({
                type: 'text-delta',
                id: '0',
                delta: delta.content
              })
            }

            if (delta.tool_calls != null) {
              for (const toolCallDelta of delta.tool_calls) {
                const index = toolCallDelta.index

                // Tool call start. OpenAI returns all information except the arguments in the first chunk.
                if (toolCalls[index] == null) {
                  if (toolCallDelta.type !== 'function') {
                    throw new InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'function' type.`
                    })
                  }

                  if (toolCallDelta.id == null) {
                    throw new InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'id' to be a string.`
                    })
                  }

                  if (toolCallDelta.function?.name == null) {
                    throw new InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'function.name' to be a string.`
                    })
                  }

                  controller.enqueue({
                    type: 'tool-input-start',
                    id: toolCallDelta.id,
                    toolName: toolCallDelta.function.name
                  })

                  toolCalls[index] = {
                    id: toolCallDelta.id,
                    type: 'function',
                    function: {
                      name: toolCallDelta.function.name,
                      arguments: toolCallDelta.function.arguments ?? ''
                    },
                    hasFinished: false
                  }

                  const toolCall = toolCalls[index]

                  if (
                    toolCall.function?.name != null &&
                    toolCall.function?.arguments != null
                  ) {
                    // send delta if the argument text has already started:
                    if (toolCall.function.arguments.length > 0) {
                      controller.enqueue({
                        type: 'tool-input-delta',
                        id: toolCall.id,
                        delta: toolCall.function.arguments
                      })
                    }

                    // check if tool call is complete
                    // (some providers send the full tool call in one chunk):
                    if (isParsableJson(toolCall.function.arguments)) {
                      controller.enqueue({
                        type: 'tool-input-end',
                        id: toolCall.id
                      })

                      controller.enqueue({
                        type: 'tool-call',
                        toolCallId: toolCall.id ?? generateId(),
                        toolName: toolCall.function.name,
                        input: toolCall.function.arguments
                      })
                      toolCall.hasFinished = true
                    }
                  }

                  continue
                }

                // existing tool call, merge if not finished
                const toolCall = toolCalls[index]

                if (toolCall.hasFinished) {
                  continue
                }

                if (toolCallDelta.function?.arguments != null) {
                  toolCall.function!.arguments +=
                    toolCallDelta.function?.arguments ?? ''
                }

                // send delta
                controller.enqueue({
                  type: 'tool-input-delta',
                  id: toolCall.id,
                  delta: toolCallDelta.function.arguments ?? ''
                })

                // check if tool call is complete
                if (
                  toolCall.function?.name != null &&
                  toolCall.function?.arguments != null &&
                  isParsableJson(toolCall.function.arguments)
                ) {
                  controller.enqueue({
                    type: 'tool-input-end',
                    id: toolCall.id
                  })

                  controller.enqueue({
                    type: 'tool-call',
                    toolCallId: toolCall.id ?? generateId(),
                    toolName: toolCall.function.name,
                    input: toolCall.function.arguments
                  })
                  toolCall.hasFinished = true
                }
              }
            }

            // annotations/citations:
            if (delta.annotations != null) {
              for (const annotation of delta.annotations) {
                controller.enqueue({
                  type: 'source',
                  sourceType: 'url',
                  id: generateId(),
                  url: annotation.url,
                  title: annotation.title
                })
              }
            }
          },

          flush(controller) {
            if (isActiveText) {
              controller.enqueue({ type: 'text-end', id: '0' })
            }

            controller.enqueue({
              type: 'finish',
              finishReason,
              usage,
              ...(providerMetadata != null ? { providerMetadata } : {})
            })
          }
        })
      ),
      request: { body },
      response: { headers: responseHeaders }
    }
  }
}

function isReasoningModel(modelId: string) {
  return (
    (modelId.startsWith('o') || modelId.startsWith('gpt-5')) &&
    !modelId.startsWith('gpt-5-chat')
  )
}

function supportsFlexProcessing(modelId: string) {
  return (
    modelId.startsWith('o3') ||
    modelId.startsWith('o4-mini') ||
    (modelId.startsWith('gpt-5') && !modelId.startsWith('gpt-5-chat'))
  )
}

function supportsPriorityProcessing(modelId: string) {
  return (
    modelId.startsWith('gpt-4') ||
    modelId.startsWith('gpt-5-mini') ||
    (modelId.startsWith('gpt-5') &&
      !modelId.startsWith('gpt-5-nano') &&
      !modelId.startsWith('gpt-5-chat')) ||
    modelId.startsWith('o3') ||
    modelId.startsWith('o4-mini')
  )
}

function getSystemMessageMode(modelId: string) {
  if (!isReasoningModel(modelId)) {
    return 'system'
  }

  return (
    reasoningModels[modelId as keyof typeof reasoningModels]
      ?.systemMessageMode ?? 'developer'
  )
}

const reasoningModels = {
  o3: {
    systemMessageMode: 'developer'
  },
  'o3-2025-04-16': {
    systemMessageMode: 'developer'
  },
  'o3-mini': {
    systemMessageMode: 'developer'
  },
  'o3-mini-2025-01-31': {
    systemMessageMode: 'developer'
  },
  'o4-mini': {
    systemMessageMode: 'developer'
  },
  'o4-mini-2025-04-16': {
    systemMessageMode: 'developer'
  }
} as const

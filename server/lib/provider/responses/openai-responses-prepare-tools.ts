import {
  type LanguageModelV2CallOptions,
  type LanguageModelV2CallWarning,
  UnsupportedFunctionalityError
} from '@ai-sdk/provider'
import { type TeamAIResponsesTool } from './openai-responses-api'
import { validateTypes } from '@ai-sdk/provider-utils'
import { doubaoWebSearchArgsSchema } from '../tool/doubao-web-search'

export async function prepareResponsesTools({
  tools,
  toolChoice,
  strictJsonSchema
}: {
  tools: LanguageModelV2CallOptions['tools']
  toolChoice?: LanguageModelV2CallOptions['toolChoice']
  strictJsonSchema: boolean
}): Promise<{
  tools?: Array<TeamAIResponsesTool>
  toolChoice?:
    | 'auto'
    | 'none'
    | 'required'
    | { type: 'file_search' }
    | { type: 'web_search_preview' }
    | { type: 'web_search' }
    | { type: 'function'; name: string }
    | { type: 'code_interpreter' }
    | { type: 'image_generation' }
  toolWarnings: LanguageModelV2CallWarning[]
}> {
  // when the tools array is empty, change it to undefined to prevent errors:
  tools = tools?.length ? tools : undefined
  console.log('tools', tools)

  const toolWarnings: LanguageModelV2CallWarning[] = []

  if (tools == null) {
    return { tools: undefined, toolChoice: undefined, toolWarnings }
  }

  const openaiTools: Array<TeamAIResponsesTool> = []

  for (const tool of tools) {
    switch (tool.type) {
      case 'function':
        openaiTools.push({
          type: 'function',
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
          strict: strictJsonSchema
        })
        break
      case 'provider-defined': {
        switch (tool.id) {
          case 'doubao.web_search': {
            const args = await validateTypes({
              value: tool.args,
              schema: doubaoWebSearchArgsSchema
            })
            openaiTools.push({
              type: 'web_search',
              max_keyword: args.max_keyword,
              limit: args.limit,
              sources: args.sources,
              user_location: args.userLocation
            })
            break
          }
        }
        break
      }
      default:
        toolWarnings.push({ type: 'unsupported-tool', tool })
        break
    }
  }

  if (toolChoice == null) {
    return { tools: openaiTools, toolChoice: undefined, toolWarnings }
  }

  const type = toolChoice.type

  switch (type) {
    case 'auto':
    case 'none':
    case 'required':
      return { tools: openaiTools, toolChoice: type, toolWarnings }
    case 'tool':
      return {
        tools: openaiTools,
        toolChoice:
          toolChoice.toolName === 'code_interpreter' ||
          toolChoice.toolName === 'file_search' ||
          toolChoice.toolName === 'image_generation' ||
          toolChoice.toolName === 'web_search_preview' ||
          toolChoice.toolName === 'web_search'
            ? { type: toolChoice.toolName }
            : { type: 'function', name: toolChoice.toolName },
        toolWarnings
      }
    default: {
      const _exhaustiveCheck: never = type
      throw new UnsupportedFunctionalityError({
        functionality: `tool choice type: ${_exhaustiveCheck}`
      })
    }
  }
}

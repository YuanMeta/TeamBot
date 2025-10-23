export type AiMode =
  | 'qwen'
  | 'deepseek'
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'openrouter'

export interface TrpcRequestError extends TRPCError {
  meta?: {
    code: number
    data: {
      code: string
      path: string
      httpStatus: number
    }
    message: string
  }
}

export interface ChatFile {
  path?: string
  name?: string
  base64?: string
  size: number
}

export interface AssistantOptions {
  searchMode?: 'openrouter'
}

interface Usage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  reasoningTokens?: number
  cachedInputTokens?: number
}
interface ToolPart {
  type: 'tool'
  toolName: string
  toolCallId: string
  input: any
  output: any
  state?: 'start' | 'completed' | 'error'
  errorText?: string
}

interface ReasonPart {
  type: 'reasoning'
  reasoning: string
  completed: boolean
}

interface TextPart {
  type: 'text'
  text: string
}

export type MessagePart = TextStep | ReasonStep | ToolPart

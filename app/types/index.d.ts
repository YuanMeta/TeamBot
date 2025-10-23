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
interface ToolStep {
  type: 'tool'
  toolName: string
  toolCallId: string
  input: any
  output: any
  state?: string
  errorText?: string
}

interface ReasonStep {
  type: 'reasoning'
  reasoning: string
}

interface TextStep {
  type: 'text'
  text: string
}

interface ChatStep {
  usage?: Usage
  finishReason?: 'stop' | 'tool-calls' | 'error'
  parts: (TextStep | ReasonStep | ToolStep)[]
}

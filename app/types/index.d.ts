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

export interface ToolCall {
  name: string
  id: string
  state: any
  input: any
  output: any
}

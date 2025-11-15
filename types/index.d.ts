export type AiMode =
  | 'qwen'
  | 'deepseek'
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'openrouter'
  | 'z-ai'
  | 'moonshotai'

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

export interface SearchOptions {
  mode?: 'google' | 'exa' | 'tavily' | 'bocha' | 'zhipu'
  apiKey?: string
  cseId?: string
  auto?: boolean
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
  text?: string
}

interface ReasonPart {
  type: 'reasoning'
  reasoning: string
  completed: boolean
  text?: string
}

interface TextPart {
  type: 'text'
  text: string
}

export type MessagePart = TextPart | ReasonPart | ToolPart

export interface SearchResult {
  title: string
  url: string
  summary?: string
  snippet?: string
  score?: number
  date?: string
  favicon?: string
}

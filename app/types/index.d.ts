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

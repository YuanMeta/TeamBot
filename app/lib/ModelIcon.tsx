import {
  Claude,
  DeepSeek,
  Gemini,
  LmStudio,
  Ollama,
  OpenAI,
  OpenRouter,
  Qwen
} from '@lobehub/icons'
import { memo } from 'react'

export const ModelIcon = memo(
  ({ mode, size }: { mode: string; size: number }) => {
    if (mode === 'openai') {
      return <OpenAI size={size} />
    }
    if (mode === 'anthropic') {
      return <Claude.Color size={size} />
    }
    if (mode === 'ollama') {
      return <Ollama size={size} />
    }
    if (mode === 'lmstudio') {
      return <LmStudio size={size} />
    }
    if (mode === 'qwen') {
      return <Qwen.Color size={size} />
    }
    if (mode === 'deepseek') {
      return <DeepSeek.Color size={size} />
    }
    if (mode === 'gemini') {
      return <Gemini.Color size={size} />
    }
    if (mode === 'openrouter') {
      return <OpenRouter size={size} />
    }
    return null
  }
)

import { Subject } from 'rxjs'
import googleIcon from '~/assets/google.png'
import exaIcon from '~/assets/exa.png'
import tavilyIcon from '~/assets/tavily.png'
import bochaIcon from '~/assets/bocha.png'
import zhipuIcon from '~/assets/zhipu.png'

export const builtInSearchMode = new Set([
  'openai',
  'doubao',
  'qwen',
  'gemini',
  'openrouter',
  'anthropic',
  'z-ai'
])

export const searchModes = [
  {
    value: 'zhipu',
    label: '智谱搜索',
    icon: zhipuIcon
  },
  {
    value: 'bocha',
    label: '博查搜索',
    icon: bochaIcon
  },
  {
    value: 'google',
    label: 'Google',
    icon: googleIcon
  },
  {
    value: 'tavily',
    label: 'Tavily',
    icon: tavilyIcon
  },
  {
    value: 'exa',
    label: 'Exa',
    icon: exaIcon
  }
]

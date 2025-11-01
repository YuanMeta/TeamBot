import type { MessagePart } from 'types'

export const getUserPrompt = (parts: MessagePart[]) => {
  return parts.find((p) => p.type === 'text')?.text
}

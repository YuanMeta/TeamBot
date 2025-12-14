import type { SearchResult } from 'types'
import type {
  assistants,
  users,
  roles,
  models,
  tools,
  chats,
  messages,
  webSearches,
  settings
} from './drizzle/schema'

export type UserData = typeof users.$inferSelect

export type AssistantData = typeof assistants.$inferSelect

export type RoleData = typeof roles.$inferSelect

export type ModelData = typeof models.$inferSelect

export type ToolData = typeof tools.$inferSelect

export type ChatData = typeof chats.$inferSelect

export type MessageData = typeof messages.$inferSelect

export type AuthProviderData = typeof authProviders.$inferSelect

export type WebSearchData = typeof webSearches.$inferSelect

export type SettingsData = typeof settings.$inferSelect

export type AssistantOptions = {
  webSearchMode: 'none' | 'builtin' | 'custom'
  agentWebSearch: boolean
  compressSearchResults: boolean
  frequencyPenalty: { open: boolean; value: number }
  maxContextTokens: number
  maxOutputTokens: number
  presencePenalty: { open: boolean; value: number }
  temperature: { open: boolean; value: number }
  topP: { open: boolean; value: number }
}

export type WebSearchParams = {
  apiKey?: string
  cseId?: string
  http?: {
    url: string
    method: 'GET' | 'POST'
    headers?: Record<string, string>
  }
}

export type MessageContext = {
  searchResult?: {
    query: string
    results?: SearchResult[]
    error?: string
    summary?: string
  }
  docs?: {
    name: string
    content: string
  }[]
}

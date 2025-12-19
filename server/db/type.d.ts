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
  settings,
  assistantUsages,
  limits
} from '../../drizzle/schema'

export type UserData = typeof users.$inferSelect

export type AssistantData = typeof assistants.$inferSelect

export type AssistantUsageData = typeof assistantUsages.$inferSelect

export type RoleData = typeof roles.$inferSelect

export type ModelData = typeof models.$inferSelect

export type ToolData = typeof tools.$inferSelect

export type ChatData = typeof chats.$inferSelect

export type MessageData = typeof messages.$inferSelect

export type AuthProviderData = typeof authProviders.$inferSelect

export type WebSearchData = typeof webSearches.$inferSelect

export type SettingsData = typeof settings.$inferSelect

export type LimitData = typeof limits.$inferSelect

export type AssistantOptions = {
  webSearchMode: 'none' | 'builtin' | 'custom'
  agentWebSearch: boolean
  compressSearchResults: boolean
  stepCount: number
  summaryMode: 'compress' | 'slice'
  messageCount: number
  frequencyPenalty: { open: boolean; value: number }
  maxContextTokens: number
  maxOutputTokens: number
  presencePenalty: { open: boolean; value: number }
  temperature: { open: boolean; value: number }
  topP: { open: boolean; value: number }
}

export type WebSearchParams = {
  apiKey?: string
  count?: number
  modeParams?: {
    google?: {
      cseId?: string
    }
    zhipu?: {
      search_engine:
        | 'search_std'
        | 'search_pro'
        | 'search_pro_sogou'
        | 'search_pro_quark'
    }
  }

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
  toolCallOriginData?: Record<string, any>
}

export interface SettingsRecord {
  disablePasswordLogin: boolean
}

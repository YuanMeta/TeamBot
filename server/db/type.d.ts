import type {
  assistants,
  users,
  roles,
  models,
  tools,
  chats,
  messages,
  webSearch,
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

export type WebSearchData = typeof webSearch.$inferSelect

export type SettingsData = typeof settings.$inferSelect

export type AssistantOptions = {
  builtin_search: boolean
  frequencyPenalty: { open: boolean; value: number }
  maxContextTokens: number
  maxOutputTokens: number
  presencePenalty: { open: boolean; value: number }
  temperature: { open: boolean; value: number }
  top_p: { open: boolean; value: number }
}

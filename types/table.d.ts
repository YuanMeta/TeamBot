import type { Knex } from 'knex'
declare module 'knex/types/tables' {
  interface Tables {
    users: TableUser
    assistants: TableAssistant
    chats: TableChat
    messages: TableMessage
    tools: TableTool
    assistant_tools: TableAssistantTool
    assistant_usages: Partial<TableAssistantUsage>
    models: TableModel
    auth_providers: TableAuthProvider
    oauth_accounts: TableOauthAccount
  }
}

export interface TableUser {
  id: string
  email: string | null
  phone: string | null
  avatar: string | null
  name: string | null
  password: string | null
  role: 'admin' | 'member'
  root: boolean
  created_at: Date
  updated_at: Date
  deleted: boolean
}

export interface TableAssistant {
  id: string
  name: string
  mode: string
  api_key: string | null
  base_url: string | null
  prompt: string | null
  models: string[]
  options: {
    builtin_search: 'on' | 'off'
    frequencyPenalty: { open: true; value: 0 }
    maxContextTokens: 20000
    maxOutputTokens: 0
    presencePenalty: { open: false; value: 0 }
    temperature: { open: false; value: 1 }
    top_p: { open: false; value: 1 }
  }
  created_at: string
  updated_at: string
}

export interface TableChat {
  id: string
  title: string
  user_id: string
  assistant_id: string
  public: boolean
  model: string | null
  deleted: boolean
  summary: string | null
  message_offset: number
  created_at: string
  updated_at: string
  last_chat_time: Date
}

export interface TableMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  user_id: string
  chat_id: string
  docs: { name: string; content: string }[] | null
  files: string[] | null
  error: string | null
  model: string | null
  reasoning_duration: number
  parts: Record<string, any>[] | null
  text: string | null
  input_tokens: number
  output_tokens: number
  total_tokens: number
  reasoning_tokens: number
  cached_input_tokens: number
  steps: Record<string, any>
  terminated: boolean
  created_at: Date
  updated_at: Date
}

// export interface TableMessageFile {
//   id: string
//   name: string
//   user_id: string
//   message_id?: string
//   chat_id?: string
//   path: string
//   size: number
//   origin: 'file'
//   created_at: string
// }

export interface TableTool {
  id: string
  name: string
  icon?: string
  description: string
  type: 'web_search' | 'http'
  params: Record<string, any>
  url?: string
  auto: boolean
  created_at: string
  updated_at: string
}

export interface TableAssistantTool {
  id: string
  assistant_id: string
  tool_id: string
}

export interface TableModel {
  id: string
  model: string
  provider: string
  options: Record<string, any>
}

export interface TableAuthProvider {
  id: string
  name: string
  issuer: string
  auth_url: string
  token_url: string
  userinfo_url: string
  jwks_uri: string
  client_id: string
  client_secret: string
  scopes: string
  use_pkce: boolean
  created_at: string
  updated_at: string
}

export interface TableOauthAccount {
  id: string
  provider_id: string
  provider_user_id: string
  user_id: string
  profile_json: Record<string, any>
}

export interface TokenLog {
  id: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  reasoning_tokens: number
  cached_input_tokens: number
}

export interface TableAssistantUsage {
  id: string
  assistant_id: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  reasoning_tokens: number
  cached_input_tokens: number
  created_at: string
}

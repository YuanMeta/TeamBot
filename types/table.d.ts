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
  id: number
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
  id: number
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
  user_id: number
  assistant_id: number | null
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
  user_id: number
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

export interface TableTool {
  id: string
  name: string
  icon?: string
  description: string
  type: 'web_search' | 'http' | 'system'
  params: Record<string, any>
  url?: string
  auto: boolean
  created_at: string
  updated_at: string
}

export interface TableAssistantTool {
  assistant_id: number
  tool_id: string | null
  system_tool_id: string | null
}

export interface TableModel {
  id: number
  model: string
  provider: string
  options: Record<string, any>
}

export interface TableAuthProvider {
  id: number
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
  provider_id: number
  provider_user_id: string
  user_id: number
  profile_json: Record<string, any>
}

export interface TableAssistantUsage {
  id: string
  assistant_id: number
  input_tokens: number
  output_tokens: number
  total_tokens: number
  reasoning_tokens: number
  cached_input_tokens: number
  created_at: string
}

export interface TableRole {
  id: number
  name: string
  remark: string | null
}

export interface TableAccessRole {
  role_id: number
  access_id: number
}

export interface TableAccess {
  id: number
  name: string
  trpcAccess: string[] | null
  routeAccess: string[] | null
  created_at: string
}

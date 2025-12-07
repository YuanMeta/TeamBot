import type { ColumnType, JSONColumnType, Generated } from 'kysely'

export type AssistantOptions = {
  builtin_search: boolean
  frequencyPenalty: { open: boolean; value: number }
  maxContextTokens: number
  maxOutputTokens: number
  presencePenalty: { open: boolean; value: number }
  temperature: { open: boolean; value: number }
  top_p: { open: boolean; value: number }
}
export interface Accesses {
  id: string
  remark: string | null
  trpc_access: JSONColumnType<string[] | null> | null
}

export interface AccessRoles {
  access_id: string
  role_id: number
}

export interface Assistants {
  api_key: string | null
  base_url: string | null
  created_at: Generated<Date | null>
  id: Generated<number>
  mode: string
  models: JSONColumnType<string[]>
  name: string
  options: JSONColumnType<AssistantOptions>
  prompt: string | null
  updated_at: Generated<Date | null>
}

export interface AssistantTools {
  assistant_id: number
  system_tool_id: string | null
  tool_id: string | null
}

export interface AssistantUsages {
  assistant_id: number
  cached_input_tokens: Generated<number>
  created_at: Generated<Date | null>
  id: Generated<string>
  input_tokens: Generated<number>
  output_tokens: Generated<number>
  reasoning_tokens: Generated<number>
  total_tokens: Generated<number>
}

export interface AuthProviders {
  auth_url: string
  client_id: string
  client_secret: string | null
  created_at: Generated<Date | null>
  id: Generated<number>
  issuer: string | null
  jwks_uri: string | null
  name: string
  scopes: string | null
  token_url: string
  updated_at: Generated<Date | null>
  use_pkce: Generated<boolean>
  userinfo_url: string | null
}

export interface Chats {
  assistant_id: number | null
  created_at: Generated<Date | null>
  deleted: Generated<boolean | null>
  id: string
  last_chat_time: Generated<Date | null>
  message_offset: Generated<number>
  model: string | null
  public: Generated<boolean | null>
  summary: string | null
  title: string
  updated_at: Generated<Date | null>
  user_id: number
}

export interface Messages {
  assistant_id: number | null
  cached_input_tokens: Generated<number>
  chat_id: string
  created_at: Generated<Date | null>
  docs: string | null
  error: string | null
  files: string | null
  id: string
  input_tokens: Generated<number>
  model: string | null
  output_tokens: Generated<number>
  parts: string | null
  reasoning_duration: number | null
  reasoning_tokens: Generated<number>
  role: string
  steps: string | null
  terminated: Generated<boolean | null>
  text: string | null
  total_tokens: Generated<number>
  updated_at: Generated<Date | null>
  user_id: number
}

export interface Models {
  id: Generated<number>
  model: string
  options: string | null
  provider: string
}

export interface OauthAccounts {
  profile_json: string | null
  provider_id: number
  provider_user_id: string
  user_id: number
}

export interface Roles {
  assistants: JSONColumnType<number[]>
  id: Generated<number>
  name: string
  remark: string | null
}

export interface Tools {
  auto: Generated<boolean>
  created_at: Generated<Date | null>
  description: string
  id: string
  name: string
  params: JSONColumnType<Record<string, any>>
  type: 'web_search' | 'http'
  updated_at: Generated<Date | null>
}

export interface UserRoles {
  role_id: number
  user_id: number
}

export interface Users {
  avatar: string | null
  created_at: Generated<Date | null>
  deleted: Generated<boolean | null>
  email: string | null
  id: Generated<number>
  name: string | null
  password: string | null
  phone: string | null
  root: Generated<boolean | null>
  updated_at: Generated<Date | null>
}

// 使用 declare 和 interface 使得 DB 可以在其他文件中扩展
export interface DB {
  access_roles: AccessRoles
  accesses: Accesses
  assistant_tools: AssistantTools
  assistant_usages: AssistantUsages
  assistants: Assistants
  auth_providers: AuthProviders
  chats: Chats
  messages: Messages
  models: Models
  oauth_accounts: OauthAccounts
  roles: Roles
  tools: Tools
  user_roles: UserRoles
  users: Users
}

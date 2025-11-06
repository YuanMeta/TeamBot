import type { Knex } from 'knex'
declare module 'knex/types/tables' {
  interface Tables {
    users: TableUser
    idps: TableIdp
    relation_idps: TableRelationIdp
    assistants: TableAssistant
    chats: TableChat
    messages: TableMessage
    message_files: TableMessageFile
    tools: TableTool
    assistant_tools: TableAssistantTool
  }
}

export interface TableUser {
  id: string
  email: string | null
  avatar: string | null
  name: string | null
  password: string | null
  role: 'admin' | 'member'
  root: boolean
  created_at: Date
  updated_at: Date
  deleted: boolean
}

export interface TableIdp {
  id: string
  name: string
  params: Record<string, any>
  created_at: string
  updated_at: string
}

export interface TableRelationIdp {
  id: string
  user_id: string
  idp_id: string
  created_at: string
  updated_at: string
}

export interface TableAssistant {
  id: string
  name: string
  mode: string
  api_key: string | null
  base_url: string | null
  prompt: string | null
  models: string[]
  options: Record<string, any>
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
  context: Record<string, any> | null
  error: string | null
  model: string | null
  reasoning_duration: number
  parts: Record<string, any>
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

export interface TableMessageFile {
  id: string
  name: string
  user_id: string
  message_id: string
  path: string
  size: number
  origin: 'file'
  created_at: string
}

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

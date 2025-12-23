import {
  pgTable,
  integer,
  varchar,
  uuid,
  text,
  jsonb,
  boolean,
  timestamp,
  index,
  primaryKey,
  unique,
  json
} from 'drizzle-orm/pg-core'
import type {
  AssistantOptions,
  MCPParams,
  MessageContext,
  SettingsRecord,
  WebSearchParams
} from '~/.server/db/type'
import type { MessagePart, WebSearchMode } from '~/types'

export const accessRoles = pgTable(
  'access_roles',
  {
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id),
    accessId: varchar('access_id')
      .notNull()
      .references(() => accesses.id)
  },
  (table) => [
    primaryKey({
      columns: [table.roleId, table.accessId]
    }),
    index().on(table.roleId)
  ]
)

export const accesses = pgTable('accesses', {
  id: varchar().primaryKey(),
  remark: text(),
  trpcAccess: jsonb('trpc_access')
})

export const assistantTools = pgTable(
  'assistant_tools',
  {
    assistantId: integer('assistant_id')
      .notNull()
      .references(() => assistants.id),
    toolId: varchar('tool_id')
      .notNull()
      .references(() => tools.id)
  },
  (table) => [
    primaryKey({ columns: [table.assistantId, table.toolId] }),
    index().on(table.assistantId)
  ]
)

export const assistantUsages = pgTable(
  'assistant_usages',
  {
    id: uuid().defaultRandom().primaryKey(),
    assistantId: integer('assistant_id')
      .notNull()
      .references(() => assistants.id),
    model: varchar().notNull(),
    inputTokens: integer('input_tokens').default(0).notNull(),
    outputTokens: integer('output_tokens').default(0).notNull(),
    totalTokens: integer('total_tokens').default(0).notNull(),
    reasoningTokens: integer('reasoning_tokens').default(0).notNull(),
    cachedInputTokens: integer('cached_input_tokens').default(0).notNull(),
    createdAt: timestamp('created_at').notNull()
  },
  (table) => [
    index().on(table.createdAt),
    unique().on(table.assistantId, table.createdAt, table.model)
  ]
)

export const assistants = pgTable('assistants', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar().notNull(),
  mode: varchar().notNull(),
  apiKey: varchar('api_key'),
  baseUrl: text('base_url'),
  prompt: text(),
  // 用于常规快捷任务
  taskModel: varchar(),
  models: jsonb().notNull().$type<string[]>(),
  options: jsonb().notNull().$type<AssistantOptions>(),
  updatedAt: timestamp('updated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const roleAssistants = pgTable(
  'role_assistants',
  {
    assistantId: integer('assistant_id')
      .notNull()
      .references(() => assistants.id),
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id)
  },
  (table) => [
    primaryKey({ columns: [table.assistantId, table.roleId] }),
    index().on(table.roleId)
  ]
)
export const authProviders = pgTable('auth_providers', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar().notNull(),
  issuer: varchar(),
  authUrl: text('auth_url').notNull(),
  description: text('description'),
  tokenUrl: text('token_url').notNull(),
  userinfoUrl: text('userinfo_url'),
  jwksUri: text('jwks_uri'),
  clientId: text('client_id').notNull(),
  clientSecret: text('client_secret'),
  scopes: varchar(),
  roleId: integer('role_id')
    .references(() => roles.id)
    .notNull(),
  disabled: boolean('disabled').default(false).notNull(),
  usePkce: boolean('use_pkce').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const chats = pgTable(
  'chats',
  {
    id: varchar().primaryKey(),
    title: text().notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    assistantId: integer('assistant_id').references(() => assistants.id, {
      onDelete: 'set null'
    }),
    public: boolean().default(false),
    model: varchar(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastChatTime: timestamp('last_chat_time').defaultNow().notNull()
  },
  (table) => [index().on(table.userId)]
)

export const messages = pgTable(
  'messages',
  {
    id: varchar().primaryKey(),
    role: varchar().notNull().$type<'user' | 'assistant'>(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    chatId: varchar('chat_id')
      .notNull()
      .references(() => chats.id),
    error: text(),
    model: varchar(),
    context: json().$type<MessageContext>(),
    assistantId: integer('assistant_id').references(() => assistants.id),
    reasoningDuration: integer('reasoning_duration'),
    parts: json().$type<MessagePart[]>(),
    files: jsonb().$type<string[]>(),
    text: text(),
    previousSummary: text('previous_summary'),
    inputTokens: integer('input_tokens').default(0).notNull(),
    outputTokens: integer('output_tokens').default(0).notNull(),
    totalTokens: integer('total_tokens').default(0).notNull(),
    reasoningTokens: integer('reasoning_tokens').default(0).notNull(),
    cachedInputTokens: integer('cached_input_tokens').default(0).notNull(),
    steps: json().$type<any[]>(),
    terminated: boolean().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => [index().on(table.userId, table.chatId)]
)

export const models = pgTable(
  'models',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    model: varchar().notNull(),
    provider: varchar().notNull(),
    options: text()
  },
  (table) => [unique().on(table.provider, table.model)]
)

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    providerId: integer('provider_id')
      .notNull()
      .references(() => authProviders.id),
    providerUserId: varchar('provider_user_id').notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    profileJson: text('profile_json')
  },
  (table) => [unique().on(table.providerId, table.providerUserId)]
)

export const roles = pgTable('roles', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar().notNull(),
  allAssistants: boolean('all_assistants').notNull(),
  remark: text()
})

export const tools = pgTable(
  'tools',
  {
    id: varchar().primaryKey(),
    name: varchar().notNull(),
    description: text().notNull(),
    type: varchar().notNull().$type<'system' | 'http' | 'web_search' | 'mcp'>(),
    params: json().$type<{
      http?: Record<string, any>
      webSearch?: WebSearchParams
      mcp?: MCPParams
    }>(),
    webSearchMode: varchar().$type<WebSearchMode>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => [index().on(table.type)]
)

export const userRoles = pgTable(
  'user_roles',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id)
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.roleId]
    }),
    index().on(table.userId)
  ]
)

export const users = pgTable(
  'users',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar(),
    phone: varchar(),
    email: varchar(),
    avatar: varchar(),
    password: varchar(),
    deleted: boolean().notNull().default(false),
    root: boolean().notNull().default(false),
    updatedAt: timestamp('updated_at'),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    unique().on(table.email),
    unique().on(table.name),
    unique().on(table.phone)
  ]
)

export const settings = pgTable('settings', {
  id: varchar().primaryKey().$type<keyof SettingsRecord>(),
  value: json().notNull().$type<any>()
})

export const limits = pgTable(
  'limits',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    assistantId: integer('assistant_id').references(() => assistants.id),
    type: varchar().notNull().$type<'chat'>(),
    time: varchar().notNull().$type<'day' | 'week' | 'month'>(),
    num: integer().notNull(),
    options: jsonb(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => [index().on(table.assistantId, table.type)]
)

export const requests = pgTable(
  'requests',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    task: varchar()
      .notNull()
      .$type<'chat' | 'title' | 'compress' | 'query_plan'>(),
    assistantId: integer('assistant_id'),
    model: varchar(),
    userId: integer('user_id'),
    messageId: varchar('message_id'),
    chatId: varchar('chat_id'),
    totalTokens: integer('total_tokens').default(0).notNull(),
    inputTokens: integer('input_tokens').default(0).notNull(),
    outputTokens: integer('output_tokens').default(0).notNull(),
    detail: text(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    index().on(table.task, table.assistantId, table.createdAt),
    index().on(table.chatId, table.messageId),
    index().on(table.createdAt),
    index().on(table.model)
  ]
)
